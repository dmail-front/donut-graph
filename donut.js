var SVGDoc = {
	elements: {},
	ns: 'http://www.w3.org/2000/svg',

	constructor: function(element){
		this.element = element || document.createElementNS(this.ns, 'svg');

		// https://github.com/wout/svg.js/blob/master/src/doc.js#L15
		this.assign({
			x: 0,
			y: 0,
			xmlns: this.ns,
			'xmlns:xlink': 'http://www.w3.org/1999/xlink',
			version: '1.1'
		});
	},

	assign: function(attrs){
		for(var attr in attrs){
			this.element.setAttribute(attr, attrs[attr]);
		}
	},

	register: function(name, proto){
		proto = SVGShape.extend(proto);
		proto.name = name;
		this.elements[name] = proto;
	},

	createElement: function(name, properties){
		var element = this.elements[name].create(this, properties);
		return element;
	}
};

var SVGShape = {
	borderWidth: 0,
	borderColor: '',
	backgroundColor: '',
	attributeAlias: {
		'borderWidth': 'stroke-width',
		'borderColor': 'stroke',
		'backgroundColor': 'fill',
		'borderOpacity': 'stroke-opacity',
		'backgroundOpacity': 'fill-opacity',
		'opacity': 'opacity',
		'cx': 'cx',
		'cy': 'cy',
		'radius': 'r',
		'path': 'd',
		'transform': 'transform',
		'x': 'x',
		'y': 'y',
		'width': 'width',
		'height': 'height',
		'xlink:href': 'xlink:href',
		'id': 'id',
		'viewBox': 'viewBox'
	},

	constructor: function(svgDocument, properties){
		this.svgDocument = svgDocument;
		this.element = this.toElement();
		this.assign(properties);
	},

	toElement: function(){
		var element = document.createElementNS(this.svgDocument.ns, this.name);
		return element;
	},

	setAttribute: function(name, value){
		this.element.setAttribute(name, value);
	},

	removeAttribute: function(name){
		this.element.removeAttribute(name);
	},

	update: function(key, value){
		this[key] = value;
		if( key in this.attributeAlias ){
			this.element.setAttribute(this.attributeAlias[key], value);
		}
	},

	assign: function(properties){
		for(var key in properties){
			this.update(key, properties[key]);
		}
	}
};

SVGDoc.register('circle', {
	cx: 0,
	cy: 0,
	radius: 0
});

SVGDoc.register('path', {

});

SVGDoc.register('g', {

});

SVGDoc.register('a', {

});

SVGDoc.register('rect', {

});

SVGDoc.register('use', {

});

SVGDoc.register('symbol', {

});

SVGDoc.register('image', {

});

var DonutGraph = {
	padding: 0,
	size: 100, // beware touching this
	iconSize: 10, // icon size relative to graph size
	arcSize: 20, // arc size relative to graph size

	outerCircle: {},
	innerCircle: {},
	arc: {borderWidth: 1},
	disabledArc: {},
	activedArc: {innerMove: 0, outerMove: 5},

	constructor: function(parent){
		this.svg = SVGDoc.create();

		this.svg.element.setAttribute('viewBox', [0, 0, this.size, this.size].join(' '));
		this.outerCircle = this.svg.createElement('circle', this.outerCircle);
		this.innerCircle = this.svg.createElement('circle', this.innerCircle);
		this.group = this.svg.createElement('g');

		parent.appendChild(this.svg.element);
	},

	updateSize: function(){
		// update arcs
		this.arcs.forEach(function(arc, index){
			this.updateArc(index);
		}, this);

		this.iconContainers.forEach(function(iconContainer, index){
			iconContainer.update('transform', 'rotate('+ [
				360 / this.values.length / 2,
				this.size / 2 + this.iconSize / 2,
				this.size / 2 + this.iconSize / 2
			].join(' ') +')');
		}, this);
	},

	createCircles: function(){
		var size = this.size;
		var availableWidth = size - this.padding * 2 - this.activedArc.outerMove * 2 - this.arc.borderWidth;
		var radius = availableWidth / 2;
		var x = radius + this.activedArc.outerMove + this.arc.borderWidth / 2 + this.padding;
		var y = radius + this.activedArc.outerMove + this.arc.borderWidth / 2 + this.padding;

		this.outerCircle.assign({
			cx: x,
			cy: y,
			radius: radius
		});

		this.innerCircle.assign({
			cx: this.outerCircle.cx,
			cy: this.outerCircle.cy,
			radius: this.outerCircle.radius - this.arcSize
		});

		this.svg.element.appendChild(this.outerCircle.element);
		this.svg.element.appendChild(this.innerCircle.element);
	},

	createParts: function(){
		var count = this.values.length;
		var step = 360 / count;

		this.parts = this.values.map(function(value, index){
			var degrees = index * step;
			var part = this.svg.createElement('a', {
				'transform': 'rotate('+ [-degrees, this.size / 2, this.size / 2].join(' ') +')',
			});

			this.group.element.appendChild(part.element);

			return part;
		}, this);
	},

	createArcs: function(){
		var count = this.values.length;
		var step = 360 / count;

		this.arcs = this.parts.map(function(part, index){
			var arc = this.svg.createElement('path', this.arc);

			/*
			var startDegrees = index * step;
			var endDegrees = index + 1 === count ? 0 : (index + 1) * step;
			arc.startDegrees =  startDegrees;
			arc.endDegrees = endDegrees;
			*/

			arc.setAttribute('grade', this.values[index].grade);
			arc.startDegrees = 0;
			arc.endDegrees = step;
			part.element.appendChild(arc.element);

			return arc;
		}, this);
	},

	createSymbols: function(){
		this.symbolGroup = this.svg.createElement('g');
		this.symbols = this.values.map(function(value, index){
			var symbol =  this.svg.createElement('symbol', {
				id: 'icon-' + index,
				viewBox: value.viewBox || '0 0 100 100'
			});

			var use = this.svg.createElement('use', {
			});

			use.element.setAttributeNS(
				'http://www.w3.org/1999/xlink',
				'xlink:href',
				value.icon
			);

			symbol.element.appendChild(use.element);
			this.symbolGroup.element.appendChild(symbol.element);

			return symbol;
		}, this);

		this.svg.element.appendChild(this.symbolGroup.element);
		this.svg.element.appendChild(this.group.element);
	},

	createIconContainers: function(){
		var availableRadius = this.outerCircle.radius - this.innerCircle.radius;
	 	var iconSize = this.iconSize;
	 	var iconX = this.size / 2 - iconSize / 2 - this.arc.borderWidth * 2;
	 	var iconY = availableRadius - iconSize / 2 - this.arc.borderWidth * 2;

		this.iconContainers = this.parts.map(function(part, index){
			var use = this.svg.createElement('use', {
				x: iconX,
				y: iconY,
				width: iconSize,
				height: iconSize
			});

			use.element.setAttributeNS(
				'http://www.w3.org/1999/xlink',
				'xlink:href',
				'#icon-' + index
			);

			part.element.appendChild(use.element);

			return use;
		}, this);
	},

	setValues: function(values){
		this.values = values;
		this.createCircles();
		this.createParts();
		this.createArcs();
		this.createSymbols();
		this.createIconContainers();

		this.updateSize();
	},

	createArcPath: function(x, y, innerRadius, outerRadius, degreeStart, degreeEnd){
		var largeArc = (degreeEnd - degreeStart) > 180 ? 1 : 0;
		var startRadians = Math.radians(degreeStart);
		var endRadians = Math.radians(degreeEnd);
		var cosStart = -Math.cos(startRadians);
		var sinStart = Math.sin(startRadians);
		var cosEnd = -Math.cos(endRadians);
		var sinEnd = Math.sin(endRadians);

		var startX = x + sinStart * outerRadius;
		var startY = y + cosStart * outerRadius;
		var endX2 = x + sinStart * innerRadius;
		var endY2 = y + cosStart * innerRadius;
		var endX = x + sinEnd * outerRadius;
		var endY = y + cosEnd * outerRadius;
		var startX2 = x + sinEnd * innerRadius;
		var startY2 = y + cosEnd * innerRadius;

		var cmd = [
			'M', startX, startY,
			'A', outerRadius, outerRadius, 0, largeArc, 1, endX, endY, //Draw outer arc
			'L', startX2, startY2, //Draw line path(this line connects outer and innner arc paths)
			'A', innerRadius, innerRadius, 0, largeArc, 0, endX2, endY2, //Draw inner arc
			'Z'
		];

		return cmd.join(' ');
	},

	getArcPath: function(arc){
		return this.createArcPath(
			this.innerCircle.cx, this.innerCircle.cy,
			this.innerCircle.radius,
			this.outerCircle.radius,
			arc.startDegrees, arc.endDegrees
		);
	},

	getActivedArcPath: function(arc){
		return this.createArcPath(
			this.innerCircle.cx, this.innerCircle.cy,
			this.innerCircle.radius - this.activedArc.innerMove,
			this.outerCircle.radius + this.activedArc.outerMove,
			arc.startDegrees, arc.endDegrees
		);
	},

	updateArc: function(index){
		var arc = this.arcs[index];
		var value = this.values[index];

		if( value.disabled ){
			arc.setAttribute('disabled', 'disabled');
		}
		else{
			arc.removeAttribute('disabled', 'disabled');
		}

		if( value.active ){
			arc.update('path', this.getActivedArcPath(arc));
		}
		else{
			arc.update('path', this.getArcPath(arc));
		}
	},

	activeArc: function(index){
		this.values[index].active = true;
		this.updateArc(index);
	},

	unactiveArc: function(index){
		this.values[index].active = false;
		this.updateArc(index);
	},

	enableArc: function(index){
		this.values[index].disabled = false;
		this.updateArc(index);
	},

	disableArc: function(index){
		this.values[index].disabled = true;
		this.updateArc(index);
	}
};
