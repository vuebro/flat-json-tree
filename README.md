# A dead simple way to manipulate JSON tree objects

The core idea is to transform a JSON tree object into a flat array, allowing standard operations like find, findIndex, filter, map, and others.

A mandatory requirement for the algorithm is that each element in the JSON tree must have a field with a unique identifier.

To preserve the tree structure and enable manipulations, the following computed properties are added to each child object:

```ts
{
  // Array of objects representing the path from root to current node
  branch: (Record < string, unknown > []);
  // Index of the object in the sibling array
  index: number;
  // Next object in the sibling array
  next: Record<string, unknown> | undefined;
  // Parent object
  parent: Record<string, unknown> | undefined;
  // Previous object in the sibling array
  prev: Record<string, unknown> | undefined;
  // Array of sibling objects
  siblings: (Record < string, unknown > []);
}
```

The transformation is performed using the `useFlatJsonTree` composable:

```ts
function useFlatJsonTree(
  // The JSON tree object
  tree: Record<string, unknown>[],
  //  Optional object to define alternative names for id, children, and computed properties
  {
    branch,
    children,
    id,
    index,
    next,
    parent,
    prev,
    siblings,
  }?: {
    branch?: string | undefined;
    children?: string | undefined;
    id?: string | undefined;
    index?: string | undefined;
    next?: string | undefined;
    parent?: string | undefined;
    prev?: string | undefined;
    siblings?: string | undefined;
  },
);
```

The composable returns an object with the following properties:

```ts
{
  // Computed flat array of objects (access via .value)
  nodes: ComputedRef<Record<string, unknown>[]>;
  // Reactive object with unique IDs as keys
  nodesMap: ComputedRef<{[id: string]: Record<string, unknown>;}>;
  // Service function to add an empty object to the tree
  add: (pId: string) => string | undefined;
  // Service function to remove an object from the tree
  remove: (pId: string) => string | undefined;
  // Service function to move an object down by one position
  down: (pId: string) => void;
  // Service function to move an object left by one position
  left: (pId: string) => string | undefined;
  // Service function to move an object right by one position
  right: (pId: string) => string | undefined;
  // Service function to move an object up by one position
  up: (pId: string) => void;
}
```

## Installation

```bash

npm i @vuebro/flat-json-tree

```

## Usage

Assume we have a tree structure with elements like:

```ts
{ id: number, name: string, children: [] }
```

> [!WARNING]
>
> Elements can contain arbitrary fields, but must have a unique identifier

### Example using `useFlatJsonTree` composable

```js
import useFlatJsonTree from "@vuebro/flat-json-tree";

const tree = [
  {
    id: 1,
    name: "root",
    children: [
      {
        id: 2,
        name: "1.2",
        children: [
          { id: 5, name: "1.2.5" },
          { id: 6, name: "1.2.6" },
        ],
      },
      { id: 3, name: "1.3" },
      {
        id: 4,
        name: "1.4",
        children: [
          { id: 7, name: "1.4.7" },
          { id: 8, name: "1.4.8" },
          { id: 9, name: "1.4.9" },
        ],
      },
    ],
  },
];

const { nodes, nodesMap, add, down, left, remove, right, up } =
  useFlatJsonTree(tree);
```

Check the resulting flat array (using `JSON.stringify` to omit computed properties):

```js
console.log(JSON.stringify(nodes.value));
```

The result is a flat array containing all objects. Keep in mind that each object has computed properties added: `branch`, `index`, `next`, `parent`, `prev`, and `siblings`

```json
[
  {
    "id": 1,
    "name": "root",
    "children": [
      {
        "id": 2,
        "name": "1.2",
        "children": [
          { "id": 5, "name": "1.2.5" },
          { "id": 6, "name": "1.2.6" }
        ]
      },
      { "id": 3, "name": "1.3" },
      {
        "id": 4,
        "name": "1.4",
        "children": [
          { "id": 7, "name": "1.4.7" },
          { "id": 8, "name": "1.4.8" },
          { "id": 9, "name": "1.4.9" }
        ]
      }
    ]
  },
  {
    "id": 2,
    "name": "1.2",
    "children": [
      { "id": 5, "name": "1.2.5" },
      { "id": 6, "name": "1.2.6" }
    ]
  },
  { "id": 5, "name": "1.2.5" },
  { "id": 6, "name": "1.2.6" },
  { "id": 3, "name": "1.3" },
  {
    "id": 4,
    "name": "1.4",
    "children": [
      { "id": 7, "name": "1.4.7" },
      { "id": 8, "name": "1.4.8" },
      { "id": 9, "name": "1.4.9" }
    ]
  },
  { "id": 7, "name": "1.4.7" },
  { "id": 8, "name": "1.4.8" },
  { "id": 9, "name": "1.4.9" }
]
```

Now let's try to find the object named "1.2.6":

```js
console.log(JSON.stringify(nodes.value.find(({ name }) => name === "1.2.6")));
```

Output:

```json
{ "id": 6, "name": "1.2.6" }
```

If the ID is known, you can use `nodesMap`:

```js
console.log(JSON.stringify(nodesMap.value[6]));
```

Output:

```json
{ "id": 6, "name": "1.2.6" }
```

Now let's try using the computed properties. Suppose we need to find the parent element of the object named "1.2.6":

```js
console.log(
  JSON.stringify(nodes.value.find(({ name }) => name === "1.2.6").parent),
);
```

The result is the object named "1.2", which is the parent element of the object named "1.2.6":

```json
{
  "id": 2,
  "name": "1.2",
  "children": [
    { "id": 5, "name": "1.2.5" },
    { "id": 6, "name": "1.2.6" }
  ]
}
```

Now let's add the object `{ id: 10, name: "1.2.10" }` to the tree after the object named "1.2.6":

```js
// Find the object named "1.2.6"
const curObject = nodes.value.find(({ name }) => name === "1.2.6");
// Add the object { id: 10, name: "1.2.10" }
curObject.siblings.splice(curObject.index + 1, 0, { id: 10, name: "1.2.10" });
// Output the tree object passed to the useFlatJsonTree composable
console.log(JSON.stringify(tree));
```

Output:

```json
[
  {
    "id": 1,
    "name": "root",
    "children": [
      {
        "id": 2,
        "name": "1.2",
        "children": [
          { "id": 5, "name": "1.2.5" },
          { "id": 6, "name": "1.2.6" },
          { "id": 10, "name": "1.2.10" }
        ]
      },
      { "id": 3, "name": "1.3" },
      {
        "id": 4,
        "name": "1.4",
        "children": [
          { "id": 7, "name": "1.4.7" },
          { "id": 8, "name": "1.4.8" },
          { "id": 9, "name": "1.4.9" }
        ]
      }
    ]
  }
]
```

Finally, let's test the service function. Move the object named "1.2.6" to the position before "1.2.5":

```js
// Find the object named "1.2.6"
const curObject = nodes.value.find(({ name }) => name === "1.2.6");
// Use the service function up to move it
up(curObject.id);
// Output the tree object passed to the useFlatJsonTree composable
console.log(JSON.stringify(tree));
```

As a result, the objects named "1.2.5" and "1.2.6" have swapped positions:

```json
[
  {
    "id": 1,
    "name": "root",
    "children": [
      {
        "id": 2,
        "name": "1.2",
        "children": [
          { "id": 6, "name": "1.2.6" },
          { "id": 5, "name": "1.2.5" }
        ]
      },
      { "id": 3, "name": "1.3" },
      {
        "id": 4,
        "name": "1.4",
        "children": [
          { "id": 7, "name": "1.4.7" },
          { "id": 8, "name": "1.4.8" },
          { "id": 9, "name": "1.4.9" }
        ]
      }
    ]
  }
]
```

> [!NOTE]
>
> <img src="https://vuebro.ru/images/drakkar.svg" width="250"/>
>
> Made on the shores of the Baltic Sea

License: [AGPL](https://choosealicense.com/licenses/agpl-3.0)
