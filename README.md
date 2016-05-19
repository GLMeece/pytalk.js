# pytalk.js

Pytalk is a module for bidirectional communication between Node and Python.

It lets you create Python process, and communicate with it via standard streams. Every message passed through pytalk gets serialized into JSON.
Before starting the process, Pytalk modifies the python code, instantiating an event loop and allowing you to send and recieve messages with `pytalk_emit`, `pytalk_on` or registering python method with `pytalk_method`.

##Usage
Install through npm
```
npm install pytalk
```

Basic example, running a OpenCV code from Node
######index.js
```javascript
let pytalk = require('pytalk');
let worker = new pytalk.Worker('worker.py');
let blur = worker.method('blur');

blur('image.jpg', (err, blurred) => {
	console.log(`Saved blurred file to ${blurred}`);
});
```
######worker.py
```python
import cv2
import uuid

@pytalk_method('blur')
def blurimage(path):
    img = cv2.imread(path)
    img = cv2.blur(img, (20, 20))
    dst = str(uuid.uuid1()) + '.jpg'
    cv2.imwrite(dst, img)
    return dst
```

##Documentation
Each Worker instance makes new python process. You can have multiple workers running the same script at the same time.
```javascript
let worker = new pytalk.Worker(scriptPath, options);
```
###Options
* `pythonPath` - path to python binary. Default is `python`

####```Worker.method(methodName)```
Use this when you need async version of some sync python function. Register python function using ```@pytalk_method(methodName)``` decorator, and use it in javascript with ```worker.method(methodName)```

####```Worker.on(eventName, callback)```
Makes `callback` be called with `data` argument every time `pytalk_emit(eventName, data` is called in python code.

####```Worker.emit(eventName, data = null)```
Calls python function, registered with `@pytalk_on(eventName)` decorator, or through `pytalk_on(eventName, callback)`

##License
MIT