
Number.prototype.map = function(in_min, in_max, out_min, out_max) {
	return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
Array.prototype.max = function() {
  return Math.max.apply(null, this);
};

Array.prototype.min = function() {
  return Math.min.apply(null, this);
};

var yx = L.latLng

function randINT(minimum, maximum) {
	return (Math.random() * (maximum - minimum + 1)) << 0
}



$('#allies').on('click', function() { placeX.initContributorsMap('allies') })
$('#raiders').on('click', function() { placeX.initContributorsMap('raiders') })
$('#contributors').on('click', function() { placeX.initContributorsMap('MutualCore') })
$('#findMyHash').on('click', function() { placeX.initStatsTool('MyHash') })
$('#stats').on('click', function() { placeX.initStatsTool('Statistics') })
$('#clearAll').on('click', function() { placeX.reInit() })
$('#map').height(window.innerHeight)
$('#map').width(window.innerWidth)
var placeX = {
	config: {
		baseURL: 'https://5.180.181.48/', //fileserver with pregenerated data (change to yours)
		mapElementID: 'map',
		w: 2000,
		h: 2000,
		placeWidth: 20,
		placeHeight: 20,
		templatePNG: 'The_Final_Clean.png',
		placesJson: 'squares.json'
	},

	map: null,
	layers: {
		allies: {},
		raiders: {},
		flowmapLayer: {},
	},
	mapBounds: [],
	placesGeoJSON: false,
	contributorsMode: '',
	firstRun: true,
	placesSelectionOverlayVisible: false,
	contributorsOverlayAdded: false,
	timespan: [],
	selectedPlaces: {},
	mapCurrentPosition: {},
	grayOverlayVisible: false,
	
	init: function() {
		this.map = L.map(placeX.config.mapElementID, {
			crs: L.CRS.Simple,
			minZoom: -2,
			zoomSnap: 0.2,
			renderer: L.canvas({ padding: 2 })
		})

		this.mapBounds = [placeX.xy(0, 0, this.config.h), placeX.xy(2000, 2000, this.config.h)]
		L.imageOverlay(placeX.config.templatePNG, this.mapBounds).addTo(this.map)

		if (!this.mapCurrentPosition.hasOwnProperty('center'))
			this.map.setView(placeX.xy(1000, 1000, this.config.h), -1);
		else
			this.map.setView(this.mapCurrentPosition.center, this.mapCurrentPosition.zoom);

		this.map.on('moveend zoomend', function() {
			placeX.mapCurrentPosition = { center: placeX.map.getCenter(), zoom: placeX.map.getZoom() }
		})
		if (!placeX.placesGeoJSON) {
			fetchJSON(this.config.placesJson)
				.then(function(data) {
					placeX.placesGeoJSON = data

					//placeX.map.fitBounds(bounds)	

				})
		} else {
			//placeX.initLayers()
		}
		L.control.zoom({ position: 'bottomleft' }).addTo(this.map);
		L.control.coordProjection({
		    crs: 'Simple',
			position: 'topleft',
			separator: ',',  
      		numDigits: 0,
			lngFormatter: this.yConvertFormat,
			latFormatter: this.xConvertFormat,
		}).addTo(this.map);

		this.initTimeSlider()
		this.firstRun = false
	},

	reInit: function() {
		console.log('reInit')
		this.map.remove()
		this.dateSlider.noUiSlider.destroy()
		$('#action-buttons').html('')
		this.map = {}
		this.layers = {}
		this.selectedPlaces = {}
		this.init()
		this.placesSelectionOverlayVisible = false
		this.grayOverlayVisible = false
	},

	clearMap: function(group) {
		group.eachLayer(function(layer) {
			group.removeLayer(layer);
		})
	},
	
	
	initTimeSlider: function() {

		this.dateSlider = document.getElementById('slider-date');
		//get available timeslices
		fetchJSON('squares/0/0/stats_sorted.json').then(function(statsJSON) {
			placeX.availableTimeslices = []
			var	timestamps = [],
				step = 1, min = 0, max = 0
			for (slice in statsJSON) {
				slice = slice.split('-')
				slice[0] = parseInt(slice[0])
				slice[1] = parseInt(slice[1])
				placeX.availableTimeslices.push(slice)
				timestamps.push(slice[0])
				timestamps.push(slice[1])
			}
			placeX.availableTimeslices.sort()
			//placeX.availableTimeslices.reverse()
			step = (slice[1] - slice[0])
			max = placeX.availableTimeslices.length - 1
			
			noUiSlider.create(placeX.dateSlider, {
				// Create two timestamps to define a range.
				range: {
					min: 0,
					max: max
				},

				step: 1,

				// Two more timestamps indicate the handle starting positions.
				start: [max - 6, max],

				// No decimals
				format: wNumb({
					decimals: 0
				})
			});
			

			var dateValues = [
			    document.getElementById('time-start'),
			    document.getElementById('time-end')
			];
			
			var formatter = new Intl.DateTimeFormat('en-GB', {
			   dateStyle: 'short', timeStyle: 'short'
			});
			
			placeX.dateSlider.noUiSlider.on('update', function (values, handle) {
			    dateValues[handle].innerHTML = formatter.format(new Date(+placeX.availableTimeslices[values[handle]][handle]))
				//TODO convert availableTimeslices to ['min-max', 'min-max']
				
					var min = values[0],
						max = values[1],
						slices = []
					for(i = min; i <= max; i++){
						slices.push(placeX.availableTimeslices[i])
					}
					placeX.timespan = slices
				
			});


		})

	},
	//TODO reuse above
	/**
	finds out what time span is available in db 
	 */
	updateTimeSlider(mode){
		if('allies' == mode || 'raiders' == mode){
			var json = mode+'_pixels-sorted.json'
		}
		else if('MutualCore' == mode){
			var json = 'places_by_contributors-sorted.json'
		}
		else if('Statistics' == mode){
			var json = 'stats_sorted.json'
		}
		
		fetchJSON('squares/0/0/'+json).then(function(statsJSON) {
		placeX.availableTimeslices = []
		var	timestamps = [],
			step = 1, min = 0, max = 0
		for (slice in statsJSON) {
			slice = slice.split('-')
			slice[0] = parseInt(slice[0])
			slice[1] = parseInt(slice[1])
			placeX.availableTimeslices.push(slice)
			timestamps.push(slice[0])
			timestamps.push(slice[1])
		}
		//FIXME sorting
		placeX.availableTimeslices.sort()
		step = (slice[1] - slice[0])  //ms to s
		max = placeX.availableTimeslices.length - 1
		placeX.dateSlider.noUiSlider.updateOptions({
			range: {
					min: min,
					max: max
				},
			start: [max - 6, max],
			})
		})
	},

/**
STATISTICS 
*/
	initStatsTool: function(tool){
		this.initSelectionLayer(tool, 'onEachSelectedPlace')
		//show acion buttons TODO show instead of append
		$('#action-buttons').html('<button type="buttons" id="show-' + tool + '" class="btn btn-success btn-block">Show ' + tool + '</button>')
		//TODO ify tool == ?
		$('#show-' + tool).click(function() { placeX.showStatsButtonAction() })

	},
	showStatsButtonAction: function() {

		
		placeX.getStats().then(function(stats) {
			if(false == stats)
				return false
			//TODO format and print stats
			$('#results').html(stats)
			
			
		})
	},
	getStats: async function(){
		if(Object.keys(this.selectedPlaces).length == 0){
			alert("Select some places first!")
			return false
		}
		var urls = [],
			jsonName = 'stats_sorted.json'
		//TODO make it better...


		for (var place in this.selectedPlaces) {
			var placeID = place
			urls.push('squares/' + placeID + '/' + jsonName) //ready to push to convertContribsGeneralToLayerGroup along with choosen timespan
		}
		//console.log(urls)
		//compute average place center
		const stats = await fetchStatsJSONs(urls)
			.then(function(statistics) {
				console.log(statistics)
				var totalPixels = 0, totalValid = 0, topUsers = {},
					slice, statsInTimespan, statsInSlice
				for(slice in placeX.timespan){
					for (p = 0; p < Object.keys(placeX.selectedPlaces).length; p++) {
						for (statsInTimespan in statistics[p]) {
							 statsInSlice = statistics[p][statsInTimespan]
							totalPixels += statsInSlice.pixels_placed
							totalValid += statsInSlice.valid_pixels
							topUsers = {...topUsers, ...statsInSlice.top_contributors_ids}
						}
					}
				}
				var totalStats = {
					totalPixels: totalPixels,
					totalValid: totalValid,
					topUsers: topUsers
					
				}
				return totalStats
			})
			
		
		return await stats

	},
/**
ALLIES/RAIDERS/CONTRIBS
 */
	initContributorsMap: function(mode) {
		//if (!this.firstRun) placeX.reInit() //must reinitialize all map to remove all layers from CanvasFlowmap (bug?)
		this.initSelectionLayer(mode, 'onEachSelectedPlace')
		//show acion buttons TODO show instead of append
		$('#action-buttons').html('<button type="buttons" id="show-' + mode + '" class="btn btn-success btn-block">Show ' + mode + '</button>')
		$('#show-' + mode).click(function() { placeX.showContributorsButtonAction() })

		//this.selectedPlaces = {}
		this.contributorsMode = mode
		this.updateTimeSlider(mode)
	},
	initSelectionLayer: function(name, onEachFn) {
		this.layers[name] = L.layerGroup()
		if(!this.placesSelectionOverlayVisible && !this.grayOverlayVisible){
			this.placeSelectionLayer = L.featureGroup()
			//TODO dont add next layer if already added (like when user sues another tool without clearing the canvas)
			
			L.geoJSON(this.placesGeoJSON, {
				style: this.placeStyle,
				onEachFeature: this[onEachFn]
			}).addTo(this.placeSelectionLayer).bringToFront()
			this.layers[name].addLayer(this.placeSelectionLayer)
		}
		
		this.layers[name].addTo(placeX.map)
		this.placesSelectionOverlayVisible = true
	},

	selectPlace: function(place, deselect = false) {
		var placeCoords = placeX.xy([place.feature.geometry.coordinates[0][0][0], place.feature.geometry.coordinates[0][0][1]], '', this.config.h)
		placeCoords = [placeCoords[1], placeCoords[0]] //flip to match lat-lon sequence
		var placeID = placeCoords.join('/')
		if (deselect) {
			if (this.selectedPlaces.hasOwnProperty(placeID)) {
				delete this.selectedPlaces[placeID]
			}
		}

		if (!this.selectedPlaces.hasOwnProperty(placeID)) {
			this.selectedPlaces[placeID] = { placeCoords: placeCoords, leafletID: place._leaflet_id }
		}
	},
	showContributorsButtonAction: function() {

		
		placeX.getContributorsGeoJSON(placeX.timespan).then(function(geoJson) {
			if(false == geoJson)
				return false
			//prepare data structure (kinda workaround...)
			geoJson.features.forEach(function(feature, index) {
				var geometry = feature.geometry.geometry
				var properties = feature.geometry.properties
				geoJson.features[index].geometry = geometry
				geoJson.features[index].properties = properties

			});
			//console.log(geoJson)
			if(placeX.layers.hasOwnProperty('flowmapLayer') && placeX.layers.flowmapLayer.hasOwnProperty('_leaflet_id'))
				placeX.layers[placeX.contributorsMode].removeLayer(placeX.layers.flowmapLayer) 
			placeX.showContributorsLayer(geoJson)
			if (!placeX.grayOverlayVisible) {
				placeX.layers[placeX.contributorsMode].removeLayer(placeX.placeSelectionLayer)
				placeX.layers.transparentOverlay = L.rectangle(placeX.mapBounds, {
					color: '#000',
					weight: 0,
					opacity: 0,
					fill: '#000',
					fillOpacity: 0.5,
					dashArray: '0',
				})
				.addTo(placeX.layers[placeX.contributorsMode])
				placeX.grayOverlayVisible = true
			}
			
			
		})
	},
	//unused
	showGeoJSON: function(geoJson, name, onEachFn) {
		this.layers[name] = L.layerGroup()
		if(!this.contributorsOverlayAdded){
			var geoJsonLayer = L.featureGroup()
			//TODO dont add next layer if already added (like when user uses another tool without clearing the canvas)
			L.geoJSON(geoJson, {
				style: this.placeContributorsStyle,
				onEachFeature: this[onEachFn]
			}).addTo(geoJsonLayer).bringToFront()
			this.layers[name].addLayer(geoJsonLayer)
		}
		
		this.layers[name].addTo(placeX.map)
		this.contributorsOverlayAdded = true
	},
	showContributorsLayer: function(geoJson) {
		//console.log(geoJson)
		this.layers.flowmapLayer = L.featureGroup()
		var color, lineWidth = 1, shadowBlur = 1, shadowColor = 'rgba(255, 0, 255, 1)', drawBezier = true

		if (this.contributorsMode == 'allies'){
			color = 'rgb(22, 255, 44)'
			shadowBlur = 0
			shadowColor = 'rgba(0, 0, 0, 0)'
		}else if (this.contributorsMode == 'raiders'){
			color = 'rgb(255, 33, 44)'
			shadowBlur = 0
			shadowColor = 'rgba(0, 0, 0, 0)'
		}else if (this.contributorsMode == 'MutualCore'){
			color = 'rgba(244, 244, 22, 0.1)'
			lineWidth = 0
			shadowBlur = 0
			shadowColor = 'rgba(0, 0, 0, 0)'
			drawBezier = false
		}
		var config = {
			// required property for this custom layer,
			// which relies on the property names of your own data
			originAndDestinationFieldIds: {
				originUniqueIdField: 'origin_id',
				originGeometry: {
					y: 'placeCenterX', //must be reversed x-y
					x: 'placeCenterY'
				},
				destinationUniqueIdField: 'destination_id',
				destinationGeometry: {
					y: 'destinationX',
					x: 'destinationY'
				}
			},
			pathDisplayMode: 'all',
			animationStarted: false,
			wrapAroundCanvas: false,
			drawBezier: drawBezier,
			canvasBezierStyle: {
				type: 'classBreaks', //simple
				symbol: {
					// use canvas styling options (compare to CircleMarker styling below)
					strokeStyle: color,
					lineWidth: lineWidth,
					lineCap: 'round',
					shadowColor: '#ff00ff',
					shadowBlur: shadowBlur
				},
				field: 'volume',
				classBreakInfos: [{
					classMinValue: 0,
					classMaxValue: 5,
					symbol: {
						lineWidth: 1,
						strokeStyle: color,
						lineCap: 'round',
						shadowColor: '#ff00ff',
						shadowBlur: shadowBlur
					}
				}, {
					classMinValue: 11,
					classMaxValue: 20,
					symbol: {
						lineWidth: 3,
						strokeStyle: color,
						lineCap: 'round',
						shadowColor: '#ff00ff',
						shadowBlur: shadowBlur
					}
				}, {
					classMinValue: 21,
					classMaxValue: 30,
					symbol: {
						lineWidth: 6,
						strokeStyle: color,
						lineCap: 'round',
						shadowColor: '#ff00ff',
						shadowBlur: shadowBlur
					}
				}, {
					classMinValue: 31,
					classMaxValue: 30000,
					symbol: {
						lineWidth: 10,
						strokeStyle: color,
						lineCap: 'round',
						shadowColor: '#ff00ff',
						shadowBlur: shadowBlur
					}
				}],
				// the layer will use the defaultSymbol if a data value doesn't fit
				// in any of the defined classBreaks
				defaultSymbol: {
					strokeStyle: '#e7e1ef',
					lineWidth: 0.5,
					lineCap: 'round',
					shadowColor: '#e7e1ef',
					shadowBlur: 1.5
				},
			},
			originStyle: {
				renderer: L.canvas({ padding: 1 }), // recommended to use L.canvas()
				radius: 8,
				weight: 1,
				color: 'rgb(195, 255, 62)',
				fillColor: color,
				fillOpacity: 0.8
			},
			destinationStyle: {
				renderer: L.canvas({ padding: 1 }),
				radius: 2.5,
				weight: 0.25,
				color: 'rgb(17, 142, 170)',
				fillColor: 'rgb(17, 142, 170)',
				fillOpacity: 0.7
			},

		}
		if ('allies' == placeX.contributorsMode || 'raiders' == placeX.contributorsMode)
			config.pointToLayer = function(geoJsonPoint, latlng) {
				return L.circleMarker(latlng);
			}
		else if ('MutualCore' == placeX.contributorsMode)
			config.pointToLayer = function(geoJsonPoint, latlng) {
				return L.rectangle(geoJsonPoint.properties.placeBounds);
			}


		L.canvasFlowmapLayer(geoJson, config).addTo(this.layers.flowmapLayer);
		this.layers.flowmapLayer.addTo(this.layers[this.contributorsMode])


	},

	/**
	fetches json
	returns geoJSON
	 */
	getContributorsGeoJSON: async function(timespan) {
		if(Object.keys(this.selectedPlaces).length == 0){
			alert("Select some places first!")
			return false
		}
		var urls = [],
			all = [],
			placeCenter,
			jsonName
		//TODO make it better...


		for (var place in this.selectedPlaces) {
			var placeID = place,
				placeCoords = this.selectedPlaces[place]["placeCoords"],
				leafletID = this.selectedPlaces[place]["leafletID"]
			if ('allies' == this.contributorsMode || 'raiders' == this.contributorsMode) {
				jsonName = this.contributorsMode + '_pixels-sorted.json'

				//TODO workaround for multiple files for each timeslice (todo: merge all these and make it like convertContribsGeneralToLayerGroup)

				var sliceStr = slice[0] + '-' + slice[1]
				urls.push('squares/' + placeID + '/' + jsonName)

				//urls.push('squares/' + placeID + '/' + jsonName)  //single merged version (unsorted)
			} else if ('MutualCore' == this.contributorsMode) {
				jsonName = 'places_by_contributors-sorted.json'
				urls.push('squares/' + placeID + '/' + jsonName) //ready to push to convertContribsGeneralToLayerGroup along with choosen timespan
			}
			placeCenter = this.getPlaceCenter(placeCoords)
			all.push(placeCenter)
		}

		var centroidOfSelectedPlaces = findCenterPoint(all)
		//console.log(urls)
		//TODO compute average place center
		const resp = await fetchJSONs(urls)
			.then(function(ContributorsCoords) {
				//console.log(ContributorsCoords)
				//TODO exclude pixels laying inside selected squares/places
				var placeCenter = centroidOfSelectedPlaces
				//TODO wrap this code in function
				if ('allies' == placeX.contributorsMode || 'raiders' == placeX.contributorsMode)
					var layerGroup = placeX.convertContributorsToLayerGroup(leafletID, placeID, placeCenter, ContributorsCoords, timespan)
				else if ('MutualCore' == placeX.contributorsMode)
					var layerGroup = placeX.convertContribsGeneralToLayerGroup(leafletID, placeID, placeCenter, ContributorsCoords, timespan)
				return layerGroup.toGeoJSON();
			})
		return await resp
	},
	/**
	converts json with pixels (like in allies_pixels.json) to layerGroup	
	 */
	convertContributorsToLayerGroup: function(id, placeID, placeCenter, ContributorsCoords, timespan = null) {
		//TODO handle timespan
		var layerGroup = L.layerGroup();
		var volume
		for(var slice in timespan){
			var sliceStr = timespan[slice][0] + '-' + timespan[slice][1]
			for (var coords in ContributorsCoords[sliceStr]) {
				volume = ContributorsCoords[sliceStr][coords]
				coords = coords.split(',')
				coords = [parseInt(coords[0]) + 0.5, parseInt(coords[1]) + 0.5] //center on pixel
				coords = this.xy(coords, '', this.config.h)
				//TODO map volume to 0..100 (find max first)  ??
				var newMarker = this.convertContributorsPixel(id, placeID, placeCenter, coords, volume)
				newMarker.addTo(layerGroup);
			}
		}
		return layerGroup


	},
	/**
	converts json with contribs-general pixels to layerGroup	
	 */
	convertContribsGeneralToLayerGroup: function(id, placeID, placeCenter, ContributorsCoords, timespan = null) {
		var layerGroup = L.layerGroup(),
			volume
		//TODO handle timespan
		timespan.forEach(function(slice, i, arr) {
			var sliceStr = slice[0] + '-' + slice[1]
			var pixels = ContributorsCoords[sliceStr]
			for(var i in pixels){
				if('max' == i) break //??
				coords = pixels[i]
				coords = coords.split(',') //TODO change to comma ,
				coords = [parseInt(coords[0]), parseInt(coords[1])] //center on pixel
				coords = placeX.getPlaceCenter(coords)
				coords = placeX.xy(coords, '', placeX.config.h)
				//TODO map volume to 0..100 (find max first)  ??
				var newMarker = placeX.convertContributorsPixel(id, placeID, placeCenter, coords, volume)
				newMarker.addTo(layerGroup);
			}
		})

		return layerGroup


	},
	//TODO version for places mode (current ver is for square mode only)
	getPlaceCenter: function(placeCoords) {
		var placeCenter = [placeCoords[0] + placeX.config.placeWidth / 2, placeCoords[1] + placeX.config.placeHeight / 2]
		return placeCenter
	},
	/**
	converts single pixel to format suitable for CanvasFlowmap
	 */
	convertContributorsPixel: function(id, placeID, placeCenter, coords, volume) {
		placeCenter = this.xy(placeCenter, '', this.config.h)
		var newMarker = L.marker(placeCenter), bounds
		//console.log(coords)
		bounds = [[coords[0] - this.config.placeWidth / 2, coords[1] - this.config.placeHeight / 2], [coords[0] + this.config.placeWidth / 2, coords[1] + this.config.placeHeight / 2]]
		newMarker.feature = {
			type: 'Point',
			properties: {
				"origin_id": randINT(333333, 999999),
				"origin_city": this.contributorsMode,
				"origin_country": "rPlace22",
				"placeCenterX": coords[0],
				"placeCenterY": coords[1],
				"destination_id": id,
				"destination_city": placeID,
				"destination_country": "rPlace22",
				"destinationX": placeCenter[0],
				"destinationY": placeCenter[1],
				"volume": volume,
				"placeBounds": bounds
				//TODO save bounds of place
			},
			geometry: undefined
		}
		return newMarker
	},
	onEachSelectedPlace: function(feature, place) {
		place.on({
			click: placeX.placeClick,
			mouseover: placeX.mouseoverPlace,
			mouseout: placeX.mouseoutPlace,
		})
		place.setStyle(placeX.placeStyle())
		place.feature.properties.selected = false

	},
	placeClick: function(e) {
		place = e.target

		if (true == place.feature.properties.selected) {
			place.feature.properties.selected = false
			place.setStyle(placeX.mouseoverPlaceStyle());
			placeX.selectPlace(place, true)
			return
		}
		place.feature.properties.selected = true
		place.setStyle(placeX.selectedPlaceStyle());
		placeX.selectPlace(place)
		//zoom
		//map.fitBounds(place.getBounds())
	},
	onEachPlaceContributors: function(feature, place) {
		place.on({
			click: placeX.placeClick,
			mouseover: placeX.mouseoverPlace,
			mouseout: placeX.mouseoutPlace,
		})
		place.setStyle(placeX.placeContributorsStyle())
		place.feature.properties.selected = false

	},
	onEachPlaceStats: function(feature, place) {
		place.on({
			click: placeX.placeClick,
			mouseover: placeX.mouseoverPlace,
			mouseout: placeX.mouseoutPlace,
		})
		place.setStyle(placeX.placeStyle())
		place.feature.properties.selected = false

	},
	placeClick: function(e) {
		place = e.target

		if (true == place.feature.properties.selected) {
			place.feature.properties.selected = false
			place.setStyle(placeX.mouseoverPlaceStyle());
			placeX.selectPlace(place, true)
			return
		}
		place.feature.properties.selected = true
		place.setStyle(placeX.selectedPlaceStyle());
		placeX.selectPlace(place)
		//zoom
		//map.fitBounds(place.getBounds())
	},
	//SYTLES
	placeStyle: function() {
		return {
			weight: 0,
			opacity: 0,
			color: '#000',
			dashArray: '2',
			fillOpacity: 0.2
		}
	},
	placeContributorsStyle: function() {
		return {
			weight: 1,
			opacity: 0.5,
			color: '#ff5',
			dashArray: '0',
			fillOpacity: 0.2
		}
	},


	mouseoverPlace: function(e) {
		place = e.target;
		if (true == place.feature.properties.selected)
			return
		place.setStyle(placeX.mouseoverPlaceStyle());
	},
	mouseoverPlaceStyle: function() {
		return {
			weight: 2,
			opacity: 1,
			color: '#f0f',
			dashArray: '0',
			fillOpacity: 0
		}
	},

	emptyStyle: function() {
		return {
			weight: 0,
			opacity: 0,
			fill: '#000',
			fillOpacity: 0.2,
			dashArray: '0',
		}
	},

	selectedPlaceStyle: function() {
		return {
			weight: 3,
			opacity: 0.6,
			color: '#f0c',
			dashArray: '0',
			fillOpacity: 0,
		}
	},

	mouseoutPlace: function(e) {
		place = e.target
		if (true == place.feature.properties.selected)
			return
		place.setStyle(placeX.placeStyle());
	},

	/**
	CONTRIBUTORS 2
	 */

	getContributorsInPlace: function() {

	},
	
	generateGeoJSONfromSquares: function(set, style){
		var set
		for ( i in set ) {
			x = set[i][0]
			y = set[i][1]
			L.rectangle([
				xy(x, y),
				xy(x + placeWidth, y + placeHeight)
			], style)
				.addTo(set)
		}
		set = set.toGeoJSON()
		return set
	},
	/**
	formatters for L.Control.coordProjection
	 */
	yConvertFormat: function(y){
		y = placeX.xy(0, y, placeX.config.h)
			return L.Util.formatNum(y.lat - 0.5, 0)
	},
	xConvertFormat: function(x){
		x = placeX.xy(x, 0, placeX.config.h)
			return L.Util.formatNum(x.lng - 0.5, 0)
	},
	
	xy: function(x, y, h) {
		if(undefined == y || undefined == x)
			return
		if (L.Util.isArray(x)) { // When doing xy([x, y]);

			return [x[1].map(0, h - 1, h - 1, 0), x[0]]
			//return yx(x[1], x[0]);
		}
	
		return yx(y.map(0, h - 1, h - 1, 0), x); // When doing xy(x, y);
	},
}


placeX.init()

//generate 10000 for testing...
/*
for ( x = 0; x < w; x += placeWidth) {
	for ( y = 0; y < h; y += placeHeight) {
		L.rectangle([
			xy(x, y),
			xy(x + placeWidth, y + placeHeight)
		], placeStyle())
			.addTo(places);
	}
}
places = places.toGeoJSON()
*/

function timestamp(str) {
	    return new Date(str).getTime();
	}

var findCenterPoint = function(arr) {
	var minX, maxX, minY, maxY;
	for (var i = 0; i < arr.length; i++) {
		minX = (arr[i][0] < minX || minX == null) ? arr[i][0] : minX;
		maxX = (arr[i][0] > maxX || maxX == null) ? arr[i][0] : maxX;
		minY = (arr[i][1] < minY || minY == null) ? arr[i][1] : minY;
		maxY = (arr[i][1] > maxY || maxY == null) ? arr[i][1] : maxY;
	}
	return [(minX + maxX) / 2, (minY + maxY) / 2];
}

async function fetchJSONs(urls) {
	//TODO check if we need to merge data sorted by time 
	var jsons, json
	urls = [...new Set(urls)]
	for (url in urls) {
		if(url instanceof Function) continue
		json = await fetchJSON(urls[url])
		jsons = { ...jsons, ...json }
	}
	return jsons
}

async function fetchStatsJSONs(urls) {
	//TODO check if we need to merge data sorted by time 
	var jsons = [], json
	urls = [...new Set(urls)]
	for (url in urls) {
		json = await fetchJSON(urls[url])
		//TODO merge...
		jsons.push(json)
	}
	return jsons
}

async function fetchJSON(url) {
	console.log(url)
	try{
		const response = await fetch(placeX.config.baseURL + url);
		await timeout(1); //simple request throttling
		return await response.json();
	}catch(e){
		return {}
	}
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
