import { toReactive } from "@vueuse/core";
import { v4 } from "uuid";
import { computed, isReactive, reactive } from "vue";

export default function (
  tree: Record<string, unknown>[],
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
) {
  const atlas = toReactive(computed(getAtlas)),
    configurable = true,
    leaves = computed(getLeaves),
    properties = {
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
            (sibling) => this[keyId] === sibling[keyId],
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
    },
    value = isReactive(tree) ? tree : reactive(tree);

  function getLeaves() {
    return getSiblingLeaves({ value });
  }

  function getSiblingLeaves(
    siblings: { configurable?: boolean; value: Record<string, unknown>[] },
    parent = {},
  ) {
    function defineProperties(
      value: Record<string, unknown>,
    ): Record<string, unknown>[] {
      Object.defineProperties(value, {
        ...properties,
        [keyParent]: parent,
        [keySiblings]: siblings,
      });
      return [
        value,
        ...getSiblingLeaves(
          {
            configurable,
            value: (value[keyChildren] ?? []) as Record<string, unknown>[],
          },
          { configurable, value },
        ),
      ];
    }
    return siblings.value.flatMap(defineProperties);
  }

  function getAtlas() {
    return Object.fromEntries(leaves.value.map(getLeafEntry));
  }

  function getLeafEntry(
    leaf: Record<string, unknown>,
  ): [string, Record<string, unknown>] {
    return [leaf[keyId] as string, leaf];
  }

  function add(pId: string) {
    const the = atlas[pId];
    if (the) {
      const children = the[keyChildren] as
          | Record<string, unknown>[]
          | undefined,
        index = the[keyIndex] as number,
        siblings = the[keySiblings] as Record<string, unknown>[];
      const id = v4();
      switch (true) {
        case !!the[keyParent]:
          siblings.splice(index + 1, 0, { [keyId]: id });
          break;
        case !!children:
          children.unshift({ [keyId]: id });
          break;
        default:
          siblings.splice(index + 1, 0, { [keyId]: id });
          break;
      }
      return id;
    }
    return undefined;
  }

  function down(pId: string) {
    const the = atlas[pId];
    if (the) {
      const index = the[keyIndex] as number,
        nextIndex = index + 1,
        siblings = the[keySiblings] as Record<string, unknown>[];
      if (index < siblings.length - 1 && siblings[index] && siblings[nextIndex])
        [siblings[index], siblings[nextIndex]] = [
          siblings[nextIndex],
          siblings[index],
        ];
    }
  }

  function left(pId: string) {
    const the = atlas[pId];
    if (the) {
      const parent = the[keyParent] as Record<string, unknown> | undefined;
      if (parent?.[keyParent]) {
        const children = (parent[keyChildren] ?? []) as Record<
            string,
            unknown
          >[],
          siblings = parent[keySiblings] as Record<string, unknown>[];
        siblings.splice(
          (parent[keyIndex] as number) + 1,
          0,
          ...children.splice(the[keyIndex] as number, 1),
        );
        return parent[keyId] as string;
      }
    }
    return undefined;
  }

  function remove(pId: string) {
    const the = atlas[pId];
    if (the) {
      const parent = the[keyParent] as Record<string, unknown> | undefined;
      if (parent) {
        const [root] = leaves.value,
          next = the[keyNext] as Record<string, unknown> | undefined,
          prev = the[keyPrev] as Record<string, unknown> | undefined,
          id = (next?.[keyId] ??
            prev?.[keyId] ??
            parent[keyId] ??
            root?.[keyId]) as string,
          siblings = the[keySiblings] as Record<string, unknown>[];
        siblings.splice(the[keyIndex] as number, 1);
        return id;
      }
    }
    return undefined;
  }

  function right(pId: string) {
    const the = atlas[pId];
    if (the) {
      const prev = the[keyPrev] as Record<string, unknown> | undefined;
      if (prev) {
        const children = (prev[keyChildren] ?? []) as Record<string, unknown>[],
          id = prev[keyId] as string,
          siblings = the[keySiblings] as Record<string, unknown>[];
        prev[keyChildren] = [
          ...children,
          ...siblings.splice(the[keyIndex] as number, 1),
        ];
        return id;
      }
    }
    return undefined;
  }

  function up(pId: string) {
    const the = atlas[pId];
    if (the) {
      const index = the[keyIndex] as number,
        prevIndex = index - 1,
        siblings = the[keySiblings] as Record<string, unknown>[];
      if (index && siblings[index] && siblings[prevIndex])
        [siblings[prevIndex], siblings[index]] = [
          siblings[index],
          siblings[prevIndex],
        ];
    }
  }

  return { add, atlas, down, leaves, left, remove, right, up };
}
