pytalk.js
========================
[![Build Status](https://travis-ci.org/tsim0/pytalk.js.svg?branch=master)](https://travis-ci.org/tsim0/pytalk.js)

Pytalk is a module for bidirectional communication between Node and Python.

It lets you create Python process, and communicate with it via standard streams. Every message passed through pytalk gets serialized into JSON.
Before starting the process, Pytalk modifies the Python code, instantiating an event loop and allowing you to send and recieve messages with `pytalk_emit`, `pytalk_on` or registering Python method with `pytalk_method`.

### Install
Install through npm
```bash
npm install pytalk
```

### Usage

1) Using a worker script, calling registered Python method asynchronously

```javascript
index.js                                      |  worker.py
------------------------------------------------------------------------------------------------
const pytalk = require('pytalk');             |  import cv2
                                              |  import uuid
                                              |  
let worker = pytalk.worker('worker.py');      |  @pytalk_method('blur')
let blur = worker.method('blur');             |  def cv2blur(path):
                                              |      img = cv2.blur(cv2.imread(path), (20, 20))
blur('image.jpg', (err, blurred) => {         |      dst = str(uuid.uuid1()) + '.jpg'
  console.log(`Saved to ${blurred}`);         |      cv2.imwrite(dst, img)
});                                           |      return dst
```

2) Importing modules using proxy PyObjects.

```javascript
const pytalk = require('pytalk');

let worker = pytalk.worker();      // Create Python process

let math = worker.import('math')   // Load modules
  , os   = worker.import('os')
  , np   = worker.import('numpy');

math.factorial(10)                 // 3628800
os.path.split('aaa/bbb')           // ['aaa', 'bbb']


let arr = np.array([4, 9, 16])     // PyObject instance
arr = np.sqrt(arr)                 // still PyObject instance
arr.tolist()                       // [2, 3, 4]
```

Note that __objects proxied by PyObjects don't get garbage collected by Python__. You can unreference them manually using `unrefAll()`.

### Documentation

#####```new Worker([scriptPath], [options])```
or, which is the same `pytalk.worker(scriptPath, options)`

###### `scriptPath`
	path to the Python script.

###### `options`
* `pythonPath` - path to the Python binary. Default is `python`.
* `stdout` - callback called when Python script prints something. Default is `console.log`.
* `stderr` - callback called on Python's raised errors. Default is `console.log`.
* `async` - If true, PyObject's methods become async. Default is `false`. ([example](https://github.com/tsim0/pytalk.js/blob/master/test/test.js#L285))

#####```Worker.method(methodName)```
Returns a `function(arg1, ..., argN, callback)`. `args` are the args passed to the Python method, registered using ```@pytalk_method(methodName)``` decorator. `callback` is a error-first function, called when Python method finishes its work. Use this when you need async version of some sync Python function. 

#####```Worker.methodSync(methodName)```
Same thing as `Worker.method`, except it waits until Python method gets its work done, and returns whatever Python function returns. Uses [deasync](https://github.com/abbr/deasync) under the hood.

#####```Worker.on(eventName, callback)```
Registers event handler for `eventName`. `callback` gets triggered with `(err, args)` passed every time `pytalk_emit(eventName, args)` is called in Python code.

#####```Worker.emit(eventName, ...args)```
Calls Python function, registered with `@pytalk_on(eventName)` decorator, or through `pytalk_on(eventName, callback)`

#####```Worker.close()```
Sends exitSignal to Python's event loop. Worker closes as soon as it finishes its current job.

#####```Worker.unrefAll()```
Removes all references to Python objects, proxied by JavaScript objects. This allows Python GC to free resources if it needs to.

#####```Worker.import(moduleName)```
Imports moduleName in Python, and returns a proxy PyObject.

### License
MIT
