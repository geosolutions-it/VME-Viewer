/*
	vme-data.js
	data model and stores for VME using Extjs
	Authors: Lorenzo Natali. Geo-Solutions
	
	Status: Beta.	
*/
function getQSParam(ParamName) {
  QS=window.location.toString(); 
  var indSta=QS.indexOf(ParamName); 
  if (indSta==-1 || ParamName=="") return null; 
  var indEnd=QS.indexOf('&amp;',indSta); 
  if (indEnd==-1) indEnd=QS.length; 
  var valore = unescape(QS.substring(indSta+ParamName.length+1,indEnd)); 
  return valore; 
}


/**
 * FigisMap.ol.clearPopupCache
 * closes all popups, if any
 */
FigisMap.ol.clearPopupCache=function(){
  if (FigisMap.popupCache){
    for (var popupKey in FigisMap.popupCache){
      var pu =FigisMap.popupCache[popupKey];
      //close popups if opened
      if (pu.opened){                 
        FigisMap.popupCache[popupKey].close();
      }
      
    }
  }
  //init
  FigisMap.popupCache ={};  
}

/**
 * FigisMap.ol.getFeatureInfoHandler
 * handler for the getFeatureInfo event
 *
 */
FigisMap.ol.getFeatureInfoHandler =  function(e) {
	var popupKey = e.xy.x + "." + e.xy.y;
	var popup;
	if (!(popupKey in FigisMap.popupCache)) {
	  popup = new GeoExt.Popup({
					title: 'Features Info',
					width: 400,
					height: 300,
					layout: "accordion",
					map: myMap,
					location: e.xy,
					listeners: {
						close: (function(key) {
							return function(panel){
								delete FigisMap.popupCache[key];
							};
						})(popupKey)
					}
			  });
				FigisMap.ol.clearPopupCache();
				FigisMap.popupCache[popupKey] = popup;
	}else{
		popup = FigisMap.popupCache[popupKey];
	}

	var addEncounters = function(btn){
		Ext.MessageBox.show({
			title: "Info",
			msg: "Releated Encounters not implemented yet",
			buttons: Ext.Msg.OK,
			icon: Ext.MessageBox.INFO,
			scope: this
		});  
	}
	
	var addSurveyData = function(btn) {
		Ext.MessageBox.show({
			title: "Info",
			msg: "Releated Survey Data not implemented yet",
			buttons: Ext.Msg.OK,
			icon: Ext.MessageBox.INFO,
			scope: this
		}); 
		
	}
	
	var buttonsVme = [];
			
	if (e.object.layers[0].name == 'Established VME areas' && FigisMap.rnd.status.logged == true){
		buttonsVme = [
		  {
			  iconCls : 'encounters-icon',
			  text    : 'Encounters',
			  //enableToggle: true,
			  //pressed : myMap.getLayersByName('Encounters')[0].visibility,
			  handler : addEncounters
		  },{
			  iconCls : 'surveydata-icon',
			  text    : 'Survey Data',
			  //enableToggle: true,
			  //pressed :myMap.getLayersByName('SurveyData')[0].visibility,
			  handler : addSurveyData
		  }
		]

	}
	var res = e.text.match(/<body[^>]*>([\s]*)<\/body>/);

	e.object.layers[0].name
	if(!res){
	  var oldItem;
	  if (popup.items){
		  oldItem =popup.items.get(e.object.layers[0].name);
	  }
	  if(oldItem){
		  oldItem.update(e.text);
	  }else{
		  popup.add({
			  itemId: e.object.layers[0].name,
			  title: e.object.layers[0].name,
			  layout: "fit",
			  bodyStyle: 'padding:10px;background-color:#F5F5DC',
			  html: e.text,
			  autoScroll: true,
			  autoWidth: true,
			  collapsible: false,
			  buttons : buttonsVme
		  });
		  popup.opened =true;
		  popup.doLayout();
		  popup.show();
	  }
	}
}

FigisMap.ol.getStore = function(layer){
  var name = layer.params.LAYERS;
  var layernames = FigisMap.fifao;
  var featureInfoStores =Vme.data.extensions.FeatureInfo;
  switch(name){
    case layernames.vme :
      return new featureInfoStores.VmeStore();
    case layernames.vme_fp : 
      return new featureInfoStores.FootprintStore();
    case layernames.vme_en : 
      return new featureInfoStores.EncountersStore();
    case layernames.vme_sd :   
      return new featureInfoStores.SurveyDataStore();
    case  layernames.vme_agg_en :  
	  case  layernames.vme_agg_sd : 
	     return new featureInfoStores.AggregateDataStore();
  }
  //return new Vme.data.extensions.FeatureInfo.VmeStore();
}

FigisMap.ol.getTemplate = function(layer){
  var name = layer.params.LAYERS;
  var layernames = FigisMap.fifao;
  var templates =Vme.data.templates;
  switch(name){
    case layernames.vme :
      return templates.vme;
    case layernames.vme_fp : 
      return templates.footprints;
    case layernames.vme_en : 
      return templates.encounters;
    case layernames.vme_sd :   
      return templates.surveydata;
    case  layernames.vme_agg_en :  
	  case  layernames.vme_agg_sd : 
	     return  templates.aggregate;
  }
}
/**
 *  FigisMap.ol.getFeatureInfoHandlerGML
 *  handler to parse GML response
 */
FigisMap.ol.getFeatureInfoHandlerGML =  function(e) {
	var popupKey = e.xy.x + "." + e.xy.y;
	var layer = e.object.layers[0];
	var reader = new OpenLayers.Format.WMSGetFeatureInfo();
	var response = reader.read(e.text);
	var store = FigisMap.ol.getStore(layer);
	var template = FigisMap.ol.getTemplate
	store.loadData(response);
	var dv = new Ext.DataView({
		itemId: layer.name,
		title: layer.name,
		layout: "fit",
		itemSelector: 'span.x-editable',
		autoScroll:true,
		border:false,
		store: store,
		tpl: FigisMap.ol.getTemplate(layer),
		singleSelect: true
	});
	var popup;
	if (!(popupKey in FigisMap.popupCache)){
	  popup = new GeoExt.Popup({
					title: 'Features Info',
					width: 400,
					height: 300,
					layout: "accordion",
					map: myMap,
					location: e.xy,
					listeners: {
						close: (function(key) {
							return function(panel){
								delete FigisMap.popupCache[key];
							};
						})(popupKey)
					}
			  });
				FigisMap.ol.clearPopupCache();
				FigisMap.popupCache[popupKey] = popup;
	}else{
		popup = FigisMap.popupCache[popupKey];
	}

	var addEncounters = function(btn){
		Ext.MessageBox.show({
			title: "Info",
			msg: "Releated Encounters not implemented yet",
			buttons: Ext.Msg.OK,
			icon: Ext.MessageBox.INFO,
			scope: this
		});  
	}
	
	var addSurveyData = function(btn) {
		Ext.MessageBox.show({
			title: "Info",
			msg: "Releated Survey Data not implemented yet",
			buttons: Ext.Msg.OK,
			icon: Ext.MessageBox.INFO,
			scope: this
		}); 
		
	}
	
	var buttonsVme = [];
			
	if (e.object.layers[0].name == 'Established VME areas' && FigisMap.rnd.status.logged == true){
		buttonsVme = [
		  {
			  iconCls : 'encounters-icon',
			  text    : 'Encounters',
			  //enableToggle: true,
			  //pressed : myMap.getLayersByName('Encounters')[0].visibility,
			  handler : addEncounters
		  },{
			  iconCls : 'surveydata-icon',
			  text    : 'Survey Data',
			  //enableToggle: true,
			  //pressed :myMap.getLayersByName('SurveyData')[0].visibility,
			  handler : addSurveyData
		  }
		]

	}
	var count =store.getCount();

	
	if(count> 0){
	  var oldItem;
	  if (popup.items){
		  oldItem =popup.items.get(layer.name);
	  }
	  if(oldItem){
		  oldItem.removeAll();
		  oldItem.add(dv);
		  oldItem.doLayout();
		  
		  
		  
	  }else{
		  popup.add({
			  itemId: layer.name,
			  title: layer.name,
			  layout: "fit",
			  border:false,
			  bodyStyle: 'padding:0px;background-color:#F5F5DC',
			  items:[dv],
			  //autoScroll: true,
			  autoWidth: true,
			  collapsible: false,
			  buttons : buttonsVme
		  });
		  
		 
		  popup.opened =true;
		  popup.doLayout();
		  popup.show();
	  }
	}
}

/** 
 * FigisMap.ol.createPopupControl(layers)
 * create getFeatureInfo control to the map.
 *
 */
FigisMap.ol.createPopupControl = function(vme){
    FigisMap.ol.clearPopupCache();
    var gml = getQSParam('gml');
		var info={controls : []};
		var vmeLyr;
		
    var control;
    for (var i = 0, len = info.controls.length; i < len; i++){
        control = info.controls[i];
        control.deactivate();  // TODO: remove when http://trac.openlayers.org/ticket/2130 is closed
        control.destroy();
	
    }

    for (vmeLyr=0; vmeLyr<vme.length; vmeLyr++){
            
      //VMSGetFeatureInfo FOR FIGIS-VME PROJECT
      control = new OpenLayers.Control.WMSGetFeatureInfo({
			  autoActivate: true,
			  layers: [vme[vmeLyr]],
			  queryVisible: true,
			  maxFeatures: 10,
			  infoFormat:  gml? "application/vnd.ogc.gml" :"text/html",
			  //vendorParams: {"CQL_FILTER": "year = '" + FigisMap.ol.getSelectedYear() + "'"},
			  eventListeners: {
				  beforegetfeatureinfo: function(e) { 
					this.vendorParams = {"CQL_FILTER": e.object.layers[0].params.CQL_FILTER};
				  }, 
				  getfeatureinfo: gml ? FigisMap.ol.getFeatureInfoHandlerGML : FigisMap.ol.getFeatureInfoHandler
			  }
	    })  
      info.controls.push(control);  
    };
    return info.controls;
    
}
/** 
 * Emulate the popup control on a vertext of a geom
 */
FigisMap.ol.emulatePupupFromGeom = function(geom){
	FigisMap.ol.clearPopupCache();
	vert  = geom.getVertices()[0];
	var evt  ={
		xy: myMap.getPixelFromLonLat(new OpenLayers.LonLat(vert.x,vert.y)  )
	}
	var cc = myMap.getControlsByClass('OpenLayers.Control.WMSGetFeatureInfo');
	for(var i = 0 ;i < cc.length ; i++) {cc[i].getInfoForClick(evt);}

}