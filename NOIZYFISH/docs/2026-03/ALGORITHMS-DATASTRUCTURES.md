# Algorithms & Data Structures - Complete Reference

## Data Structures

### Arrays
```javascript
// Static Array
const arr = [1, 2, 3, 4, 5];

// Dynamic Array
class DynamicArray {
    constructor() {
        this.capacity = 2;
        this.length = 0;
        this.data = new Array(this.capacity);
    }
    
    push(item) {
        if (this.length >= this.capacity) {
            this.resize();
        }
        this.data[this.length] = item;
        this.length++;
    }
    
    resize() {
        this.capacity *= 2;
        const newData = new Array(this.capacity);
        for (let i = 0; i < this.length; i++) {
            newData[i] = this.data[i];
        }
        this.data = newData;
    }
}
```
**Time Complexity**: Access O(1), Search O(n), Insert O(1) amortized
**Space Complexity**: O(n)

### Linked Lists
```javascript
class Node {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
        this.length = 0;
    }
    
    append(data) {
        const node = new Node(data);
        if (!this.head) {
            this.head = node;
        } else {
            let current = this.head;
            while (current.next) {
                current = current.next;
            }
            current.next = node;
        }
        this.length++;
    }
    
    remove(data) {
        if (!this.head) return false;
        if (this.head.data === data) {
            this.head = this.head.next;
            this.length--;
            return true;
        }
        let current = this.head;
        while (current.next) {
            if (current.next.data === data) {
                current.next = current.next.next;
                this.length--;
                return true;
            }
            current = current.next;
        }
        return false;
    }
}
```
**Time Complexity**: Access O(n), Search O(n), Insert O(1), Delete O(n)
**Space Complexity**: O(n)

### Stacks
```javascript
class Stack {
    constructor() {
        this.items = [];
    }
    
    push(item) {
        this.items.push(item);
    }
    
    pop() {
        return this.items.pop();
    }
    
    peek() {
        return this.items[this.items.length - 1];
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
}
```
**Time Complexity**: All operations O(1)
**Space Complexity**: O(n)

### Queues
```javascript
class Queue {
    constructor() {
        this.items = [];
    }
    
    enqueue(item) {
        this.items.push(item);
    }
    
    dequeue() {
        return this.items.shift();
    }
    
    front() {
        return this.items[0];
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
}
```
**Time Complexity**: Enqueue O(1), Dequeue O(n) - use circular buffer for O(1)
**Space Complexity**: O(n)

### Hash Tables
```javascript
class HashTable {
    constructor(size = 53) {
        this.keyMap = new Array(size);
    }
    
    _hash(key) {
        let total = 0;
        const WEIRD_PRIME = 31;
        for (let i = 0; i < Math.min(key.length, 100); i++) {
            const char = key[i];
            const value = char.charCodeAt(0) - 96;
            total = (total * WEIRD_PRIME + value) % this.keyMap.length;
        }
        return total;
    }
    
    set(key, value) {
        const index = this._hash(key);
        if (!this.keyMap[index]) {
            this.keyMap[index] = [];
        }
        this.keyMap[index].push([key, value]);
    }
    
    get(key) {
        const index = this._hash(key);
        if (this.keyMap[index]) {
            for (let i = 0; i < this.keyMap[index].length; i++) {
                if (this.keyMap[index][i][0] === key) {
                    return this.keyMap[index][i][1];
                }
            }
        }
        return undefined;
    }
}
```
**Time Complexity**: Average O(1), Worst O(n)
**Space Complexity**: O(n)

### Trees
```javascript
class TreeNode {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

class BinarySearchTree {
    constructor() {
        this.root = null;
    }
    
    insert(value) {
        const newNode = new TreeNode(value);
        if (!this.root) {
            this.root = newNode;
            return this;
        }
        let current = this.root;
        while (true) {
            if (value === current.value) return undefined;
            if (value < current.value) {
                if (!current.left) {
                    current.left = newNode;
                    return this;
                }
                current = current.left;
            } else {
                if (!current.right) {
                    current.right = newNode;
                    return this;
                }
                current = current.right;
            }
        }
    }
    
    find(value) {
        if (!this.root) return false;
        let current = this.root;
        while (current) {
            if (value < current.value) {
                current = current.left;
            } else if (value > current.value) {
                current = current.right;
            } else {
                return true;
            }
        }
        return false;
    }
}
```
**Time Complexity**: Average O(log n), Worst O(n)
**Space Complexity**: O(n)

### Graphs
```javascript
class Graph {
    constructor() {
        this.adjacencyList = {};
    }
    
    addVertex(vertex) {
        if (!this.adjacencyList[vertex]) {
            this.adjacencyList[vertex] = [];
        }
    }
    
    addEdge(vertex1, vertex2) {
        this.adjacencyList[vertex1].push(vertex2);
        this.adjacencyList[vertex2].push(vertex1);
    }
    
    dfs(start) {
        const result = [];
        const visited = {};
        const adjacencyList = this.adjacencyList;
        
        (function dfsHelper(vertex) {
            if (!vertex) return null;
            visited[vertex] = true;
            result.push(vertex);
            adjacencyList[vertex].forEach(neighbor => {
                if (!visited[neighbor]) {
                    return dfsHelper(neighbor);
                }
            });
        })(start);
        
        return result;
    }
    
    bfs(start) {
        const queue = [start];
        const result = [];
        const visited = {};
        visited[start] = true;
        
        while (queue.length) {
            const vertex = queue.shift();
            result.push(vertex);
            
            this.adjacencyList[vertex].forEach(neighbor => {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    queue.push(neighbor);
                }
            });
        }
        return result;
    }
}
```
**Time Complexity**: O(V + E) where V = vertices, E = edges
**Space Complexity**: O(V)

---

## Algorithms

### Sorting Algorithms

#### Quick Sort
```javascript
function quickSort(arr) {
    if (arr.length <= 1) return arr;
    
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = [];
    const middle = [];
    const right = [];
    
    for (let element of arr) {
        if (element < pivot) left.push(element);
        else if (element > pivot) right.push(element);
        else middle.push(element);
    }
    
    return [...quickSort(left), ...middle, ...quickSort(right)];
}
```
**Time Complexity**: Average O(n log n), Worst O(n²)
**Space Complexity**: O(log n)

#### Merge Sort
```javascript
function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    
    return merge(left, right);
}

function merge(left, right) {
    const result = [];
    let i = 0, j = 0;
    
    while (i < left.length && j < right.length) {
        if (left[i] < right[j]) {
            result.push(left[i++]);
        } else {
            result.push(right[j++]);
        }
    }
    
    return result.concat(left.slice(i)).concat(right.slice(j));
}
```
**Time Complexity**: O(n log n)
**Space Complexity**: O(n)

### Search Algorithms

#### Binary Search
```javascript
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        
        if (arr[mid] === target) {
            return mid;
        } else if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return -1;
}
```
**Time Complexity**: O(log n)
**Space Complexity**: O(1)

### Dynamic Programming

#### Fibonacci (Memoized)
```javascript
function fibonacci(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 2) return 1;
    
    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
    return memo[n];
}
```
**Time Complexity**: O(n)
**Space Complexity**: O(n)

#### Longest Common Subsequence
```javascript
function lcs(str1, str2, i = 0, j = 0, memo = {}) {
    const key = `${i}-${j}`;
    if (key in memo) return memo[key];
    
    if (i === str1.length || j === str2.length) return 0;
    
    if (str1[i] === str2[j]) {
        memo[key] = 1 + lcs(str1, str2, i + 1, j + 1, memo);
    } else {
        memo[key] = Math.max(
            lcs(str1, str2, i + 1, j, memo),
            lcs(str1, str2, i, j + 1, memo)
        );
    }
    
    return memo[key];
}
```
**Time Complexity**: O(m * n)
**Space Complexity**: O(m * n)

### Graph Algorithms

#### Dijkstra's Shortest Path
```javascript
class PriorityQueue {
    constructor() {
        this.values = [];
    }
    
    enqueue(val, priority) {
        this.values.push({val, priority});
        this.sort();
    }
    
    dequeue() {
        return this.values.shift();
    }
    
    sort() {
        this.values.sort((a, b) => a.priority - b.priority);
    }
}

function dijkstra(graph, start, finish) {
    const nodes = new PriorityQueue();
    const distances = {};
    const previous = {};
    const path = [];
    let smallest;
    
    // Build initial state
    for (let vertex in graph.adjacencyList) {
        if (vertex === start) {
            distances[vertex] = 0;
            nodes.enqueue(vertex, 0);
        } else {
            distances[vertex] = Infinity;
            nodes.enqueue(vertex, Infinity);
        }
        previous[vertex] = null;
    }
    
    while (nodes.values.length) {
        smallest = nodes.dequeue().val;
        if (smallest === finish) {
            while (previous[smallest]) {
                path.push(smallest);
                smallest = previous[smallest];
            }
            break;
        }
        
        if (smallest || distances[smallest] !== Infinity) {
            for (let neighbor in graph.adjacencyList[smallest]) {
                let nextNode = graph.adjacencyList[smallest][neighbor];
                let candidate = distances[smallest] + nextNode.weight;
                let nextNeighbor = nextNode.node;
                
                if (candidate < distances[nextNeighbor]) {
                    distances[nextNeighbor] = candidate;
                    previous[nextNeighbor] = smallest;
                    nodes.enqueue(nextNeighbor, candidate);
                }
            }
        }
    }
    
    return path.concat(smallest).reverse();
}
```
**Time Complexity**: O(V²) or O(E log V) with binary heap
**Space Complexity**: O(V)

---

## Complexity Analysis

### Big O Notation
- **O(1)**: Constant time - Hash table lookup
- **O(log n)**: Logarithmic - Binary search
- **O(n)**: Linear - Array traversal
- **O(n log n)**: Linearithmic - Efficient sorting
- **O(n²)**: Quadratic - Nested loops
- **O(2ⁿ)**: Exponential - Recursive Fibonacci
- **O(n!)**: Factorial - Permutations

### Space Complexity
- **O(1)**: Constant space
- **O(n)**: Linear space
- **O(n²)**: Quadratic space

---

**Master these fundamentals to build efficient, scalable systems!**

