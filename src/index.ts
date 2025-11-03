import uid from "uuid-random";
import { computed, isReactive, reactive } from "vue";

export type unObject = Record<string, unknown>;

const configurable = true;

/**
 * Creates an array of node objects with parent and siblings
 *
 * @param {unObject[]} siblings - Array of sibling nodes
 * @param {unObject} [parent] - Parent node
 * @returns {{ node: unObject; parent: unObject; siblings: unObject }[]} Array
 *   of objects containing node, parent, and siblings
 */
const getItems = (siblings: unObject[], parent?: unObject) =>
  [...siblings].reverse().map((node: unObject) => ({ node, parent, siblings }));

/**
 * Creates a flat representation of a JSON tree with helper functions to
 * manipulate the tree
 *
 * @param {unObject[]} tree - The tree structure to flatten
 * @param {object} [root0] - Configuration object for key names
 * @param {string} [root0.branch] - Key name for branch property (default:
 *   "branch")
 * @param {string} [root0.children] - Key name for children property (default:
 *   "children")
 * @param {string} [root0.id] - Key name for id property (default: "id")
 * @param {string} [root0.index] - Key name for index property (default:
 *   "index")
 * @param {string} [root0.next] - Key name for next property (default: "next")
 * @param {string} [root0.parent] - Key name for parent property (default:
 *   "parent")
 * @param {string} [root0.prev] - Key name for prev property (default: "prev")
 * @param {string} [root0.siblings] - Key name for siblings property (default:
 *   "siblings")
 * @returns {object} Object containing nodes, nodesMap and manipulation
 *   functions
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
  const properties = {
    [keyBranch]: {
      /**
       * Gets the branch (path from root) for the current node
       *
       * @returns {unObject[]} Array of nodes from root to current node
       */
      get(this: unObject): unObject[] {
        const ret = [this];
        while (ret[0]?.[keyParent]) ret.unshift(ret[0][keyParent] as unObject);
        return ret;
      },
    },
    [keyIndex]: {
      /**
       * Gets the index of the current node in its siblings array
       *
       * @returns {number} Index of the node in its siblings array
       */
      get(this: unObject): number {
        /**
         * Checks if the given sibling is the same as the current node
         *
         * @param {unObject} sibling - The sibling to compare
         * @returns {boolean} True if the sibling matches the current node
         */
        const isSibling = (sibling: unObject) => this[keyId] === sibling[keyId];
        return (this[keySiblings] as unObject[]).findIndex(isSibling);
      },
    },
    [keyNext]: {
      /**
       * Gets the next sibling node
       *
       * @returns {undefined | unObject} Next sibling node or undefined if none
       */
      get(this: unObject): undefined | unObject {
        return (this[keySiblings] as unObject[])[
          (this[keyIndex] as number) + 1
        ];
      },
    },
    [keyPrev]: {
      /**
       * Gets the previous sibling node
       *
       * @returns {undefined | unObject} Previous sibling node or undefined if
       *   none
       */
      get(this: unObject): undefined | unObject {
        return (this[keySiblings] as unObject[])[
          (this[keyIndex] as number) - 1
        ];
      },
    },
  };

  /**
   * Generator function that traverses the tree and yields each node
   *
   * @param {unObject[]} nodes - Array of nodes to traverse
   * @yields {unObject} Each node in the tree
   */
  const genNodes = function* (nodes: unObject[]) {
      const stack = getItems(nodes);
      while (stack.length) {
        const { node, parent, siblings } = stack.pop() ?? {};
        if (node) {
          /**
           * Checks if a property key is not already defined in the node
           *
           * @param {string} key - The property key to check
           * @returns {boolean} True if the key is not in the node
           */
          const isNotInNode = (key: string) => !(key in node);
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
          if (Object.keys(properties).some(isNotInNode))
            Object.defineProperties(node, properties);
          yield node;
          stack.push(
            ...getItems((node[keyChildren] ?? []) as unObject[], node),
          );
        }
      }
    },
    /**
     * Generates a flat array of nodes from the tree structure
     *
     * @returns {unObject[]} Array of nodes in the tree
     */
    getNodes = () => [...genNodes(isReactive(tree) ? tree : reactive(tree))];

  const nodes = computed(getNodes);

  /**
   * Gets the entry (key-value pair) for a node using its ID
   *
   * @param {unObject} node - The node to create an entry for
   * @returns {[string, unObject]} A tuple with the node ID and the node object
   */
  const getNodeEntry = (node: unObject) => [node[keyId] as string, node],
    /**
     * Creates a map of nodes with node IDs as keys
     *
     * @returns {Record<string, unObject>} Object mapping node IDs to node
     *   objects
     */
    getNodesMap = () => Object.fromEntries(nodes.value.map(getNodeEntry));

  const nodesMap = computed(getNodesMap);

  /**
   * Function to run actions on nodes
   *
   * @param {string} pId - ID of the node to perform action on
   * @param {string} action - Action to perform (add, addChild, remove, up,
   *   down, left, right)
   * @returns {string | undefined} ID of the affected node or undefined
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

  return {
    /**
     * Adds a new sibling node after the specified node
     *
     * @param {string} pId - ID of the node to add a sibling to
     * @returns {string | undefined} ID of the newly added node
     */
    add: (pId: string) => run(pId, "add"),
    /**
     * Adds a new child node to the specified node
     *
     * @param {string} pId - ID of the node to add a child to
     * @returns {string | undefined} ID of the newly added child node
     */
    addChild: (pId: string) => run(pId, "addChild"),
    /**
     * Moves the specified node one position down within its siblings
     *
     * @param {string} pId - ID of the node to move down
     * @returns {void}
     */
    down: (pId: string) => run(pId, "down"),
    /**
     * Moves the specified node one level up in the hierarchy, making it a
     * sibling of its parent
     *
     * @param {string} pId - ID of the node to move left
     * @returns {string | undefined} ID of the parent node if successful
     */
    left: (pId: string) => run(pId, "left"),
    nodes,
    nodesMap,
    /**
     * Removes the specified node from the tree
     *
     * @param {string} pId - ID of the node to remove
     * @returns {string | undefined} ID of the next node that gets focus after
     *   removal
     */
    remove: (pId: string) => run(pId, "remove"),
    /**
     * Moves the specified node as a child of the previous sibling
     *
     * @param {string} pId - ID of the node to move right
     * @returns {string | undefined} ID of the new parent node if successful
     */
    right: (pId: string) => run(pId, "right"),
    /**
     * Moves the specified node one position up within its siblings
     *
     * @param {string} pId - ID of the node to move up
     * @returns {void}
     */
    up: (pId: string) => run(pId, "up"),
  };
};
