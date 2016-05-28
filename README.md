pytalk.js
========================
[![Build Status](https://travis-ci.org/tsim0/pytalk.js.svg?branch=master)](https://travis-ci.org/tsim0/pytalk.js)

Pytalk is a module for bidirectional communication between Node and Python.

It lets you create Python process, and communicate with it via standard streams. Every message passed through pytalk gets serialized into JSON.
Before starting the process, Pytalk modifies the python code, instantiating an event loop and allowing you to send and recieve messages with `pytalk_emit`, `pytalk_on` or registering python method with `pytalk_method`.

### Install
Install through npm
```bash
npm install pytalk
```

### Usage

1) Using a worker script, calling registered python method asynchronously

```javascript
index.js                                      |  worker.py
------------------------------------------------------------------------------------------------
import pytalk from 'pytalk';                  |  import cv2
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
import pytalk from 'pytalk';

let worker = pytalk.worker();      // Create python process

let math = worker.import('math')   // Load modules
  , os   = worker.import('os')
  , np   = worker.import('numpy');

math.factorial(10)                 // 3628800
os.path.split('aaa/bbb')           // ['aaa', 'bbb']


let arr = np.array([4, 9, 16])     // PyObject instance
arr = np.sqrt(arr)                 // still PyObject instance
arr.tolist()                       // [2, 3, 4]
```

Note that __objects proxied by PyObjects don't get garbage collected by Python__

### Documentation

#####```new Worker([scriptPath], [options])```
or, which is the same `pytalk.worker(scriptPath, options)`

###### `scriptPath`
	path to the python script.

###### `options`
* `pythonPath` - path to python binary. Default is `python`
* `stdout` - callback called when python script prints something. Default is `console.log`
* `stderr` - callback called on python's raised errors. Default is `console.log`

#####```Worker.method(methodName)```
Use this when you need async version of some sync python function. Register python function using ```@pytalk_method(methodName)``` decorator, and use it in javascript with ```worker.method(methodName)```

#####```Worker.on(eventName, callback)```
Registers event handler for `eventName`. `callback` gets triggered with `(err, args)` passed every time `pytalk_emit(eventName, args)` is called in python code.

#####```Worker.emit(eventName, ...args)```
Calls python function, registered with `@pytalk_on(eventName)` decorator, or through `pytalk_on(eventName, callback)`

#####```Worker.close()```
Sends exitSignal to python's event loop. Worker closes as soon as it finishes its current job.

### License
MIT
