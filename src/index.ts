import { computed, isReactive, reactive } from "vue";

/* -------------------------------------------------------------------------- */
/*                         Тип универсального объекта                         */
/* -------------------------------------------------------------------------- */

export type unObject = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/*                            Значения по-умолчанию                           */
/* -------------------------------------------------------------------------- */

const configurable = true;

/* -------------------------------------------------------------------------- */
/*                              Служебные функции                             */
/* -------------------------------------------------------------------------- */

/**
 *
 * @param siblings
 * @param parent
 */
const getItems = (siblings: unObject[], parent?: unObject) =>
    [...siblings].reverse().map((node) => ({ node, parent, siblings })),
  uid = () => {
    const url = URL.createObjectURL(new Blob()),
      uid = url.split("/").pop() ?? crypto.randomUUID();
    URL.revokeObjectURL(url);
    return uid;
  };

/* -------------------------------------------------------------------------- */
/*                 Композабл для работы с древовидным объектом                */
/* -------------------------------------------------------------------------- */

/**
 *
 * @param tree
 * @param root0
 * @param root0.branch
 * @param root0.children
 * @param root0.id
 * @param root0.index
 * @param root0.next
 * @param root0.parent
 * @param root0.prev
 * @param root0.siblings
 */
export default (
  tree: unObject[],
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
  /* -------------------------------------------------------------------------- */
  /*            Расчетные свойства для работы с древовидным объектом            */
  /* -------------------------------------------------------------------------- */

  const properties: PropertyDescriptorMap = {
    [keyBranch]: {
      /**
       *
       */
      get(this: unObject) {
        const ret = [this];
        while (ret[0]?.[keyParent]) ret.unshift(ret[0][keyParent] as unObject);
        return ret;
      },
    },
    [keyIndex]: {
      /**
       *
       */
      get(this: unObject) {
        return (this[keySiblings] as unObject[]).findIndex(
          (sibling) => this[keyId] === sibling[keyId],
        );
      },
    },
    [keyNext]: {
      /**
       *
       */
      get(this: unObject) {
        return (this[keySiblings] as unObject[])[
          (this[keyIndex] as number) + 1
        ];
      },
    },
    [keyPrev]: {
      /**
       *
       */
      get(this: unObject) {
        return (this[keySiblings] as unObject[])[
          (this[keyIndex] as number) - 1
        ];
      },
    },
  };

  /* -------------------------------------------------------------------------- */
  /*       Формирование массива элементов дерева простого и ассоциативного      */
  /* -------------------------------------------------------------------------- */

  /**
   *
   * @param nodes
   */
  const getNodes = function* (nodes: unObject[]) {
      const stack = getItems(nodes);
      while (stack.length) {
        const { node, parent, siblings } = stack.pop() ?? {};
        if (node) {
          if (node[keyParent] !== parent)
            Object.defineProperty(node, keyParent, {
              configurable,
              value: parent,
            });
          if (node[keySiblings] !== siblings)
            Object.defineProperty(node, keySiblings, {
              configurable,
              value: siblings,
            });
          if (Object.keys(properties).some((key) => !(key in node)))
            Object.defineProperties(node, properties);
          yield node;
          stack.push(
            ...getItems((node[keyChildren] ?? []) as unObject[], node),
          );
        }
      }
    },
    nodes = computed(() => [
      ...getNodes(isReactive(tree) ? tree : reactive(tree)),
    ]),
    nodesMap = computed(() =>
      Object.fromEntries(
        nodes.value.map((node) => [node[keyId] as string, node]),
      ),
    );

  /* -------------------------------------------------------------------------- */
  /*       Служебная функция для выполнения действия над элементом дерева       */
  /* -------------------------------------------------------------------------- */

  /**
   *
   * @param pId
   * @param action
   */
  const run = (pId: string, action: string) => {
    const the = nodesMap.value[pId];
    if (the) {
      const [root] = nodes.value,
        index = the[keyIndex] as number,
        next = the[keyNext] as undefined | unObject,
        nextIndex = index + 1,
        parent = the[keyParent] as undefined | unObject,
        prev = the[keyPrev] as undefined | unObject,
        prevIndex = index - 1,
        siblings = the[keySiblings] as unObject[];
      switch (action) {
        case "add": {
          const id = uid();
          siblings.splice(nextIndex, 0, { [keyId]: id });
          return id;
        }
        case "addChild": {
          const id = uid();
          if (!Array.isArray(the[keyChildren])) the[keyChildren] = [];
          (the[keyChildren] as unObject[]).unshift({ [keyId]: id });
          return id;
        }
        case "down":
          if (
            index < siblings.length - 1 &&
            siblings[index] &&
            siblings[nextIndex]
          )
            [siblings[index], siblings[nextIndex]] = [
              siblings[nextIndex],
              siblings[index],
            ];
          break;
        case "left":
          if (parent?.[keyParent]) {
            (parent[keySiblings] as unObject[]).splice(
              (parent[keyIndex] as number) + 1,
              0,
              ...siblings.splice(index, 1),
            );
            return parent[keyId] as string;
          }
          break;
        case "remove": {
          const id = (next?.[keyId] ??
            prev?.[keyId] ??
            parent?.[keyId] ??
            root?.[keyId]) as string | undefined;
          siblings.splice(index, 1);
          return id;
        }
        case "right":
          if (prev) {
            const children = (prev[keyChildren] ?? []) as unObject[],
              id = prev[keyId] as string;
            prev[keyChildren] = [...children, ...siblings.splice(index, 1)];
            return id;
          }
          break;
        case "up":
          if (index && siblings[index] && siblings[prevIndex])
            [siblings[prevIndex], siblings[index]] = [
              siblings[index],
              siblings[prevIndex],
            ];
          break;
      }
    }
    return;
  };

  /* -------------------------------------------------------------------------- */
  /*            Формирование возвращаемого объекта композабл функции            */
  /* -------------------------------------------------------------------------- */

  return {
    /**
     *
     * @param pId
     */
    add: (pId: string) => run(pId, "add"),
    /**
     *
     * @param pId
     */
    addChild: (pId: string) => run(pId, "addChild"),
    /**
     *
     * @param pId
     */
    down: (pId: string) => run(pId, "down"),
    /**
     *
     * @param pId
     */
    left: (pId: string) => run(pId, "left"),
    nodes,
    nodesMap,
    /**
     *
     * @param pId
     */
    remove: (pId: string) => run(pId, "remove"),
    /**
     *
     * @param pId
     */
    right: (pId: string) => run(pId, "right"),
    /**
     *
     * @param pId
     */
    up: (pId: string) => run(pId, "up"),
  };
};
