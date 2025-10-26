import uid from "uuid-random";
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

const getItems = (siblings: unObject[], parent?: unObject) =>
  [...siblings].reverse().map((node) => ({ node, parent, siblings }));

/* -------------------------------------------------------------------------- */
/*                 Композабл для работы с древовидным объектом                */
/* -------------------------------------------------------------------------- */

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

  const properties = {
    [keyBranch]: {
      /**
       * A computed property that returns an array containing the current object
       * and all its parent objects by traversing up the parent chain using the
       * keyParent property.
       *
       * @returns {unObject[]} An array of objects starting from the topmost
       *   parent to the current object.
       */
      get(this: unObject): unObject[] {
        const ret = [this];
        while (ret[0]?.[keyParent]) ret.unshift(ret[0][keyParent] as unObject);
        return ret;
      },
    },
    [keyIndex]: {
      /**
       * A computed property that finds the index of the current object in its
       * siblings array.
       *
       * @returns {number} The index of the current object in its siblings
       *   array.
       */
      get(this: unObject): number {
        return (this[keySiblings] as unObject[]).findIndex(
          (sibling) => this[keyId] === sibling[keyId],
        );
      },
    },
    [keyNext]: {
      /**
       * A computed property that returns the next sibling of the current
       * object.
       *
       * @returns {unObject | undefined} The next sibling object or undefined if
       *   there is no next sibling.
       */
      get(this: unObject): undefined | unObject {
        return (this[keySiblings] as unObject[])[
          (this[keyIndex] as number) + 1
        ];
      },
    },
    [keyPrev]: {
      /**
       * A computed property that returns the previous sibling of the current
       * object.
       *
       * @returns {unObject | undefined} The previous sibling object or
       *   undefined if there is no previous sibling.
       */
      get(this: unObject): undefined | unObject {
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
   * A generator function that traverses a tree-like structure of nodes and
   * yields each node after setting up its relationships and properties
   *
   * @param {unObject[]} nodes - Array of nodes to be processed
   * @yields {unObject} Each node in the tree, with its relationships and
   *   properties
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
        stack.push(...getItems((node[keyChildren] ?? []) as unObject[], node));
      }
    }
  };
  const nodes = computed(() => [
    ...getNodes(isReactive(tree) ? tree : reactive(tree)),
  ]);
  const nodesMap = computed(() =>
    Object.fromEntries(
      nodes.value.map((node) => [node[keyId] as string, node]),
    ),
  );

  /* -------------------------------------------------------------------------- */
  /*       Служебная функция для выполнения действия над элементом дерева       */
  /* -------------------------------------------------------------------------- */

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
    add: (pId: string) => run(pId, "add"),
    addChild: (pId: string) => run(pId, "addChild"),
    down: (pId: string) => run(pId, "down"),
    left: (pId: string) => run(pId, "left"),
    nodes,
    nodesMap,
    remove: (pId: string) => run(pId, "remove"),
    right: (pId: string) => run(pId, "right"),
    up: (pId: string) => run(pId, "up"),
  };
};
