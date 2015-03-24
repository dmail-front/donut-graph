if( !Object.assign ){
	Object.assign = function(object){
		var i = 1, j = arguments.length, arg;
		for(;i<j;i++){
			arg = arguments[i];
			Object.keys(arg).forEach(function(name){
				object[name] = arg[name];
			});
		}
		return object;
	};
}

Object.define = function(object){
	var i = 1, j = arguments.length, arg;
	for(;i<j;i++){
		arg = arguments[i];
		Object.keys(arg).forEach(function(name){
			Object.defineProperty(object, name, Object.getOwnPropertyDescriptor(arg, name));
		});
	}
	return object;
};

Object.prototype.create = function(){
	var instance = Object.create(this), constructor = instance.constructor;

	if( typeof constructor === 'function' && constructor != Object.prototype.constructor ){
		var ret = constructor.apply(instance, arguments);
		if( typeof ret == 'object' ) instance = ret;
	}

	return instance;
};

Object.prototype.extend = function(){
	var instance = Object.create(this), i = 0, j = arguments.length;
	for(;i<j;i++){
		Object.define(instance, arguments[i]);
	}
	return instance;
};

['create', 'extend'].forEach(function(name){
	Object.defineProperty(Object.prototype, name, {
		writable: false,
		enumerable: false,
		configurable: true,
		value: Object.prototype[name]
	});
});

String.prototype.render = function(object){
	return String(this).replace(/\\?\{([^{}]+)\}/g, function(match, name){
		if( match.charAt(0) == '\\' ) return match.slice(1);
		return object[name] != null ? object[name] : '';
	});
};

Math.radians = function(degrees){
	return degrees * Math.PI / 180;
};

Math.degrees = function(radians){
	return radians * 180 / Math.PI;
};

Math.distance = function(x1, x2, y1, y2){
	var x = x2 - x1;
	var y = y2 - y1;
	return Math.sqrt(x * x + y * y);
};

function isPercentage(value){
	return typeof value === 'string' && value.slice(-1) === '%';
}

function percentOf(percent, value){
	percent = parseInt(percent.slice(0, -1), 10);
	return Math.floor((percent / 100) * value);
}

function toSize(dimension, available){
	var size;

	if( typeof dimension === 'string' ){
		if( dimension === 'auto' ){
			size = available;
		}
		if( isPercentage(dimension) ){
			size = percentOf(dimension, available);
		}
	}
	else if( typeof dimension === 'number' ){
		size = dimension;
	}

	return size;
}