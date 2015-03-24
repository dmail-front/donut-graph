function assign(element, attrs){
	for(var attr in attrs){
		element.setAttribute(attr, attrs[attr]);
	}
}

var SVGDoc = {
	elements: {},
	ns: 'http://www.w3.org/2000/svg',

	constructor: function(element){
		this.element = element || document.createElementNS(this.ns, 'svg');

		// https://github.com/wout/svg.js/blob/master/src/doc.js#L15
		assign(this.element, {
			x: 0,
			y: 0,
			xmlns: this.ns,
			'xmlns:xlink': 'http://www.w3.org/1999/xlink',
			version: '1.1'
		});
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
		'x': 'cx',
		'y': 'cy',
		'radius': 'r',
		'path': 'd'
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

var Circle = SVGDoc.register('circle', {
	x: 0,
	y: 0,
	radius: 0
});

var Path = SVGDoc.register('path', {
	path: null
});

var Group = SVGDoc.register('g', {});

var DonutGraph = {
	padding: 0,
	size: 100, // beware touching this

	outerCircle: {
		backgroundOpacity: 0
	},
	innerCircle: {
		backgroundOpacity: 0
	},
	arc: {
		size: 15,
		borderWidth: 1,
		borderColor: '#F6F6F6'
	},
	disabledArc: {
		backgroundColor: '#DCE6E7',
	},
	activedArc: {
		innerMove: 0,
		outerMove: 5
	},

	constructor: function(svg){
		this.svg = SVGDoc.create(svg);
		this.outerCircle = this.svg.createElement('circle', this.outerCircle);
		this.innerCircle = this.svg.createElement('circle', this.innerCircle);
		this.group = this.svg.createElement('g');
	},

	setValues: function(values){
		this.values = values;

		var step = 360 / values.length;
		this.arcs = this.values.map(function(value, index){
			var startDegrees = index * step;
			var endDegrees = index + 1 === values.length ? 0 : (index + 1) * step;
			var arc = this.svg.createElement('path', this.arc);

			arc.startDegrees =  startDegrees;
			arc.endDegrees = endDegrees;

			return arc;
		}, this);
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
			this.innerCircle.x, this.innerCircle.y,
			this.innerCircle.radius,
			this.outerCircle.radius,
			arc.startDegrees, arc.endDegrees
		);
	},

	getActivedArcPath: function(arc){
		return this.createArcPath(
			this.innerCircle.x, this.innerCircle.y,
			this.innerCircle.radius - this.activedArc.innerMove,
			this.outerCircle.radius + this.activedArc.outerMove,
			arc.startDegrees, arc.endDegrees
		);
	},

	updateArc: function(index){
		var arc = this.arcs[index];
		var value = this.values[index];

		if( value.disabled ){
			arc.assign(this.disabledArc);
		}
		else{
			arc.update('backgroundColor', value.color);
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
	},

	updateSize: function(){
		this.svg.element.setAttribute('viewBox', [0, 0, this.size, this.size].join(' '));

		var size = this.size;
		var availableWidth = size - this.padding * 2 - this.activedArc.outerMove * 2 - this.arc.borderWidth;
		var radius = availableWidth / 2;
		var x = radius + this.activedArc.outerMove + this.arc.borderWidth / 2 + this.padding;
		var y = radius + this.activedArc.outerMove + this.arc.borderWidth / 2 + this.padding;

		this.outerCircle.assign({
			x: x,
			y: y,
			radius: radius
		});

		this.innerCircle.assign({
			x: this.outerCircle.x,
			y: this.outerCircle.y,
			radius: this.outerCircle.radius - this.arc.size
		});

		// update arcs
		this.arcs.forEach(function(arc, index){
			this.updateArc(index);
		}, this);
	},

	draw: function(){
		this.updateSize();

		var svgElement = this.svg.element;

		svgElement.appendChild(this.outerCircle.element);
		svgElement.appendChild(this.innerCircle.element);
		var groupElement = this.group.element;
		this.arcs.forEach(function(arc){
			groupElement.appendChild(arc.element);
		});
		svgElement.appendChild(groupElement);
	}
};