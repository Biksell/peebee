const _ = require("underscore")

let a = {array: [{id: "5a1"},{id: "1b"},{id: "c25a6a"},]}
let b = {array: [{id: "asd123a"},{id: "55a"},{id: "1s"},]}
let arr = [a, b]
arr = arr.flatMap(a => a)
for (const i of arr) {
  console.log(i.array)
}
