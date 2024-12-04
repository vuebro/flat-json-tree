import type { Reactive } from "vue";

import uuid from "uuid-random";
import { computed, isReactive, nextTick, reactive, watch } from "vue";

const configurable = true;
export default (
  tree: Record<string, unknown>[],
  options: Record<string, string> = {},
) => {
  const data = (isReactive(tree) ? tree : reactive(tree)) as Reactive<
    Record<string, unknown>[]
  >;
  const {
    branch: keyBranch,
    children: keyChildren,
    id: keyId,
    index: keyIndex,
    next: keyNext,
    parent: keyParent,
    prev: keyPrev,
    siblings: keySiblings,
  } = {
    branch: "branch",
    children: "children",
    id: "id",
    index: "index",
    next: "next",
    parent: "parent",
    prev: "prev",
    siblings: "siblings",
    ...options,
  };
  {
    const index = {
      get(this: Record<string, unknown>) {
        return (this[keySiblings] as Record<string, unknown>[]).findIndex(
          ({ id }) => this[keyId] === id,
        );
      },
    };
    const prev = {
      get(this: Record<string, unknown>) {
        return (this[keySiblings] as Record<string, unknown>[])[
          (this[keyIndex] as number) - 1
        ];
      },
    };
    const next = {
      get(this: Record<string, unknown>) {
        return (this[keySiblings] as Record<string, unknown>[])[
          (this[keyIndex] as number) + 1
        ];
      },
    };
    const branch = {
      get(this: Record<string, unknown>) {
        const ret = [this];
        while (ret[0][keyParent])
          ret.unshift(ret[0][keyParent] as Record<string, unknown>);
        return ret;
      },
    };
    const defineProperties = (
      siblings: { configurable?: boolean; value: Record<string, unknown>[] },
      parent: { configurable?: boolean; value?: Record<string, unknown> } = {
        value: undefined,
      },
    ) => {
      siblings.value.forEach((value) => {
        Reflect.defineProperty(value, keyBranch, branch);
        Reflect.defineProperty(value, keyIndex, index);
        Reflect.defineProperty(value, keyNext, next);
        Reflect.defineProperty(value, keyParent, parent);
        Reflect.defineProperty(value, keyPrev, prev);
        Reflect.defineProperty(value, keySiblings, siblings);
        defineProperties(
          {
            configurable,
            value: (value[keyChildren] ?? []) as Record<string, unknown>[],
          },
          { configurable, value },
        );
      });
    };
    watch(data, (value) => {
      defineProperties({ value });
    });
  }
  const getLeaves = (
    leaves: Record<string, unknown>[],
  ): Record<string, unknown>[] =>
    leaves.flatMap((element) => [
      element,
      ...getLeaves((element[keyChildren] ?? []) as Record<string, unknown>[]),
    ]);
  const leaves = computed(() => getLeaves(data));
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
      const id = uuid();
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
