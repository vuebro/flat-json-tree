import type { Reactive } from "vue";

import { v4 } from "uuid";
import { computed, isReactive, nextTick, reactive } from "vue";

const configurable = true;
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
  } = {},
) => {
  const properties = {
    [keyBranch]: {
      get(this: Record<string, unknown>) {
        const ret = [this];
        while (ret[0][keyParent])
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
        return (this[keySiblings] as Record<string, unknown>[])[
          (this[keyIndex] as number) + 1
        ];
      },
    },
    [keyPrev]: {
      get(this: Record<string, unknown>) {
        return (this[keySiblings] as Record<string, unknown>[])[
          (this[keyIndex] as number) - 1
        ];
      },
    },
  };
  const getLeaves: (
    siblings: { configurable?: boolean; value: Record<string, unknown>[] },
    parent?: { configurable?: boolean; value?: Record<string, unknown> },
  ) => Record<string, unknown>[] = (siblings, parent = { value: undefined }) =>
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
  const value = (isReactive(tree) ? tree : reactive(tree)) as Reactive<
    Record<string, unknown>[]
  >;
  const leaves = computed(() => getLeaves({ value }));
  const up = (pId: string | undefined) => {
    const the = leaves.value.find((leaf) => leaf[keyId] === pId);
    if (the) {
      const index = the[keyIndex] as number;
      const siblings = the[keySiblings] as Record<string, unknown>[];
      if (index)
        [siblings[index - 1], siblings[index]] = [
          siblings[index],
          siblings[index - 1],
        ];
    }
  };
  const down = (pId: string | undefined) => {
    const the = leaves.value.find((leaf) => leaf[keyId] === pId);
    if (the) {
      const index = the[keyIndex] as number;
      const siblings = the[keySiblings] as Record<string, unknown>[];
      if (index < siblings.length - 1)
        [siblings[index], siblings[index + 1]] = [
          siblings[index + 1],
          siblings[index],
        ];
    }
  };
  const right = (pId: string | undefined) => {
    const the = leaves.value.find((leaf) => leaf[keyId] === pId);
    if (the) {
      const prev = the[keyPrev] as Record<string, unknown> | undefined;
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
    return undefined;
  };
  const left = (pId: string | undefined) => {
    const the = leaves.value.find((leaf) => leaf[keyId] === pId);
    if (the) {
      const parent = the[keyParent] as Record<string, unknown> | undefined;
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
    return undefined;
  };
  const add = (pId: string | undefined) => {
    const the = leaves.value.find((leaf) => leaf[keyId] === pId);
    if (the) {
      const children = the[keyChildren] as
        | Record<string, unknown>[]
        | undefined;
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
    return undefined;
  };
  const remove = async (pId: string | undefined) => {
    const the = leaves.value.find((leaf) => leaf[keyId] === pId);
    if (the) {
      const next = the[keyNext] as Record<string, unknown> | undefined;
      const parent = the[keyParent] as Record<string, unknown> | undefined;
      const prev = the[keyPrev] as Record<string, unknown> | undefined;
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
        if (!id) {
          await nextTick();
          [{ id }] = leaves.value as [{ id: string }];
        }
        return id;
      }
    }
    return undefined;
  };
  return { add, down, leaves, left, remove, right, up };
};
