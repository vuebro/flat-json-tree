import type { ComputedRef, Reactive } from "vue";

import { v4 } from "uuid";
import { computed, isReactive, reactive } from "vue";

export default (
  tree: Reactive<Record<string, unknown>[]> | Record<string, unknown>[],
  {
    branch: keyBranch = "branch",
    children: keyChildren = "children",
    id: keyId = "id",
    index: keyIndex = "index",
    next: keyNext = "next",
    parent: keyParent = "parent",
    prev: keyPrev = "prev",
    siblings: keySiblings = "siblings",
  }: {
    branch?: string;
    children?: string;
    id?: string;
    index?: string;
    next?: string;
    parent?: string;
    prev?: string;
    siblings?: string;
  } = {},
): {
  add: (pId: string) => null | string;
  down: (pId: string) => void;
  leaves: ComputedRef<Record<string, unknown>[]>;
  left: (pId: string) => null | string;
  remove: (pId: string) => null | string;
  right: (pId: string) => null | string;
  up: (pId: string) => void;
} => {
  /* -------------------------------------------------------------------------- */
  /*                                  Constants                                 */
  /* -------------------------------------------------------------------------- */

  const configurable = true;

  /* -------------------------------------------------------------------------- */
  /*                                   Objects                                  */
  /* -------------------------------------------------------------------------- */

  const properties: PropertyDescriptorMap = {
    [keyBranch]: {
      get(this: Record<string, unknown>) {
        const ret = [this];
        while (ret[0]?.[keyParent])
          ret.unshift(ret[0][keyParent] as Record<string, unknown>);
        return ret;
      },
    },
    [keyIndex]: {
      get(this: Record<string, unknown>) {
        return (this[keySiblings] as Record<string, unknown>[]).findIndex(
          ({ id }) => this[keyId] === id,
        );
      },
    },
    [keyNext]: {
      get(this: Record<string, unknown>) {
        return (
          (this[keySiblings] as Record<string, unknown>[])[
            (this[keyIndex] as number) + 1
          ] ?? null
        );
      },
    },
    [keyPrev]: {
      get(this: Record<string, unknown>) {
        return (
          (this[keySiblings] as Record<string, unknown>[])[
            (this[keyIndex] as number) - 1
          ] ?? null
        );
      },
    },
  };

  /* -------------------------------------------------------------------------- */
  /*                                  Functions                                 */
  /* -------------------------------------------------------------------------- */

  const getLeaves = (
    siblings: { configurable?: boolean; value: Record<string, unknown>[] },
    parent: {
      configurable?: boolean;
      value: null | Record<string, unknown>;
    } = { value: null },
  ): Record<string, unknown>[] =>
    siblings.value.flatMap((value) => {
      Object.defineProperties(value, {
        ...properties,
        [keyParent]: parent,
        [keySiblings]: siblings,
      });
      return [
        value,
        ...getLeaves(
          {
            configurable,
            value: (value[keyChildren] ?? []) as Record<string, unknown>[],
          },
          { configurable, value },
        ),
      ];
    });

  /* -------------------------------------------------------------------------- */
  /*                                  Reactives                                 */
  /* -------------------------------------------------------------------------- */

  const value: Reactive<Record<string, unknown>[]> = isReactive(tree)
    ? tree
    : reactive(tree);

  /* -------------------------------------------------------------------------- */
  /*                                  Functions                                 */
  /* -------------------------------------------------------------------------- */

  const startLeaves = (): Record<string, unknown>[] => getLeaves({ value });

  /* -------------------------------------------------------------------------- */
  /*                                Computations                                */
  /* -------------------------------------------------------------------------- */

  const leaves: ComputedRef<Record<string, unknown>[]> = computed(startLeaves);

  /* -------------------------------------------------------------------------- */
  /*                                  Functions                                 */
  /* -------------------------------------------------------------------------- */

  const add = (pId: string): null | string => {
    const the: null | Record<string, unknown> =
      leaves.value.find((leaf) => leaf[keyId] === pId) ?? null;
    if (the) {
      const children = (the[keyChildren] ?? null) as
        | null
        | Record<string, unknown>[];
      const index = the[keyIndex] as number;
      const siblings = the[keySiblings] as Record<string, unknown>[];
      const id = v4();
      switch (true) {
        case !!the[keyParent]:
          siblings.splice(index + 1, 0, { id } as Record<string, unknown>);
          break;
        case !!children:
          children.unshift({ id } as Record<string, unknown>);
          break;
        default:
          siblings.splice(index + 1, 0, { id } as Record<string, unknown>);
          break;
      }
      return id;
    }
    return null;
  };

  /* -------------------------------------------------------------------------- */

  const down = (pId: string): void => {
    const the: null | Record<string, unknown> =
      leaves.value.find((leaf) => leaf[keyId] === pId) ?? null;
    if (the) {
      const index: number = the[keyIndex] as number;
      const nextIndex: number = index + 1;
      const siblings: Record<string, unknown>[] = the[keySiblings] as Record<
        string,
        unknown
      >[];
      if (index < siblings.length - 1 && siblings[index] && siblings[nextIndex])
        [siblings[index], siblings[nextIndex]] = [
          siblings[nextIndex],
          siblings[index],
        ];
    }
  };

  /* -------------------------------------------------------------------------- */

  const left = (pId: string): null | string => {
    const the: null | Record<string, unknown> =
      leaves.value.find((leaf) => leaf[keyId] === pId) ?? null;
    if (the) {
      const parent = (the[keyParent] ?? null) as null | Record<string, unknown>;
      if (parent) {
        const siblings = parent[keySiblings] as Record<string, unknown>[];
        if (parent[keyParent]) {
          siblings.splice(
            (parent[keyIndex] as number) + 1,
            0,
            ...(
              (parent[keyChildren] ?? []) as Record<string, unknown>[]
            ).splice(the[keyIndex] as number, 1),
          );
          return parent[keyId] as string;
        }
      }
    }
    return null;
  };

  /* -------------------------------------------------------------------------- */

  const remove = (pId: string): null | string => {
    const the: null | Record<string, unknown> =
      leaves.value.find((leaf) => leaf[keyId] === pId) ?? null;
    if (the) {
      const next = (the[keyNext] ?? null) as null | Record<string, unknown>;
      const parent = (the[keyParent] ?? null) as null | Record<string, unknown>;
      const prev = (the[keyPrev] ?? null) as null | Record<string, unknown>;
      if (parent) {
        let id: string;
        switch (true) {
          case !!next:
            ({ id } = next as { id: string });
            break;
          case !!prev:
            ({ id } = prev as { id: string });
            break;
          default:
            ({ id } = parent as { id: string });
        }
        (the[keySiblings] as Record<string, unknown>[]).splice(
          the[keyIndex] as number,
          1,
        );
        if (!id) [{ id }] = leaves.value as [{ id: string }];
        return id;
      }
    }
    return null;
  };

  /* -------------------------------------------------------------------------- */

  const right = (pId: string): null | string => {
    const the: null | Record<string, unknown> =
      leaves.value.find((leaf) => leaf[keyId] === pId) ?? null;
    if (the) {
      const prev = (the[keyPrev] ?? null) as null | Record<string, unknown>;
      if (prev) {
        const children = (prev[keyChildren] ?? []) as Record<string, unknown>[];
        const id = prev[keyId] as string;
        prev[keyChildren] = [
          ...children,
          ...(the[keySiblings] as Record<string, unknown>[]).splice(
            the[keyIndex] as number,
            1,
          ),
        ];
        return id;
      }
    }
    return null;
  };

  /* -------------------------------------------------------------------------- */

  const up = (pId: string): void => {
    const the: null | Record<string, unknown> =
      leaves.value.find((leaf) => leaf[keyId] === pId) ?? null;
    if (the) {
      const index: number = the[keyIndex] as number;
      const prevIndex: number = index - 1;
      const siblings: Record<string, unknown>[] = the[keySiblings] as Record<
        string,
        unknown
      >[];
      if (index && siblings[index] && siblings[prevIndex])
        [siblings[prevIndex], siblings[index]] = [
          siblings[index],
          siblings[prevIndex],
        ];
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                                    Main                                    */
  /* -------------------------------------------------------------------------- */

  return { add, down, leaves, left, remove, right, up };

  /* -------------------------------------------------------------------------- */
};
