/*
	vme-data.js
	data model and stores for VME using Extjs
	Authors: Lorenzo Natali. Geo-Solutions
	
	Status: Beta.	
*/

/**
 * Ext.ux.LazyJSonStore: lazyStore to load without 
 * knowing the total size of result list. Useful for
 * paged queries when the total number of records is 
 * not available/required
 *
 */
Ext.ux.LazyJsonStore = Ext.extend(Ext.data.JsonStore,{
	resetTotal:function (){
		this.tot = null;
	
	},
	loadRecords : function(o, options, success){
		if (this.isDestroyed === true) {
			return;
		}
		if(!o || success === false){
			if(success !== false){
				this.fireEvent('load', this, [], options);
			}
			if(options.callback){
				options.callback.call(options.scope || this, [], options, false, o);
			}
			return;
		}
		this.crs = this.reader.jsonData.crs;
		this.bbox =  this.reader.jsonData.bbox;
		this.featurecollection = this.reader.jsonData;
		//custom total workaround
		var estimateTotal = function(o,options,store){
			var current = o.totalRecords + options.params[store.paramNames.start] ;
			var currentCeiling = options.params[store.paramNames.start] + options.params[store.paramNames.limit];
			if(current < currentCeiling){
				store.tot = current;
				return current;
			}else{
				
				return  store.tot || 100000000000000000; 
			}

		}
		o.totalRecords = estimateTotal(o,options,this);
		//end of custom total workaround
		
		var r = o.records, t = o.totalRecords || r.length;
		if(!options || options.add !== true){
			if(this.pruneModifiedRecords){
				this.modified = [];
			}
			for(var i = 0, len = r.length; i < len; i++){
				r[i].join(this);
			}
			if(this.snapshot){
				this.data = this.snapshot;
				delete this.snapshot;
			}
			this.clearData();
			this.data.addAll(r);
			this.totalLength = t;
			this.applySort();
			this.fireEvent('datachanged', this);
		}else{
			this.totalLength = Math.max(t, this.data.length+r.length);
			this.add(r);
		}
		this.fireEvent('load', this, r, options);
		if(options.callback){
			options.callback.call(options.scope || this, r, options, true);
		}
	}
	
});
	
/**
 * Ext.ux.LazyPagingToolbar
 * Paging toolbar for lazy stores like Ext.ux.LazyJsonStore
 */
Ext.ux.LazyPagingToolbar = Ext.extend(Ext.PagingToolbar,{
		
		displayInfo: true,
		displayMsg: "",
		emptyMsg: "",
		afterPageText:"",
		beforePageText:"",
		onLoad : function(store, r, o){
			if(!this.rendered){
				this.dsLoaded = [store, r, o];
				return;
			}
			var p = this.getParams();
			this.cursor = (o.params && o.params[p.start]) ? o.params[p.start] : 0;
			var d = this.getPageData(), ap = d.activePage, ps = d.pages;

			this.afterTextItem.setText(String.format(this.afterPageText, d.pages));
			this.inputItem.setValue(ap);
			this.first.setDisabled(ap == 1);
			this.prev.setDisabled(ap == 1);
			this.next.setDisabled(ap >= ps);
			this.last.setDisabled(ap >= ps);
			this.refresh.enable();
			this.updateInfo();
			this.fireEvent('change', this, d);
		},
		listeners:{
			beforerender: function(){
				this.refresh.setVisible(false);
				this.last.setVisible(false);
			},
			change: function (total,pageData){
				if(pageData.activePage>pageData.pages){
					this.movePrevious();
					this.next.setDisabled(true);
				}
				
			}
		}
})

var Vme={};

/** 
 * Vme.data contains templates and base Extjs Stores, models to load Vme data
 */
Vme.data={
	templates: {
	  /** Vme.data.templates.searchResult
	   * displays search results with utiities to display human readable fields
	   */
		searchResult: 
				new Ext.XTemplate(
				'<tpl for=".">'+
					'<div class="search-result">' +
						'<em>Local Name:</em>{localname}<br/>'+
						'<em>Status:</em><span class="status" >{[this.writeStatus(values.status)]}</span><br/>' +
						'<em>Reporting Year:</em>{year} <br/> '+
						'<em>Area Type:</em><span classhttp://www.google.it/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&ved=0CDMQFjAA&url=http%3A%2F%2Fwww.tizag.com%2FhtmlT%2Fhtmlbold.php&ei=3DCzUJXvHoSF4ASp2YDwCQ&usg=AFQjCNH4TiHKTWpib2DrnZ9auTwG4pMBGg&sig2=XVGFpxbI_IMqf6__y_5djQ="type" >{type}</span> <br/> '+
						'<em>Geographic reference:</em><span class="geo_ref" >{geo_ref}</span> <br/>'+
						
						//'<span class="id" >{vme_id}</span><br/>'+
						'<span class="own" >{owner}</span><br/>'+
						'<span class="source" style="font-weight:bold">Vulnerable Marine Ecosystem Database</span>'+
					'</div>'+
				'</tpl>',{
				compiled:true,
				writeStatus:function(status){
					var statusRecord=  Vme.data.stores.VmeStatusStore.getById(status);
					var text =statusRecord ? statusRecord.get('displayText'):status;
					return text;
				}

				})
	},
	constants:{
		pageSize:5
	}
	

};



/**
 * Models: base tipes for Vme for Extjs Stores 
 *
 */
Vme.data.models = {
	rfmos : [['NAFO','NAFO'],['NEAFC','NEAFC'],['CCAMLR','CCAMLR']],
	areaTypes : [
		[0, FigisMap.label('VME_TYPE_UNKNOWN')],
		[1, FigisMap.label('VME_TYPE_VME')],
		[2, FigisMap.label('VME_TYPE_RISK')],
		[3, FigisMap.label('VME_TYPE_BPA')],
		[4, FigisMap.label('VME_TYPE_CLOSED')],
		[5, FigisMap.label('VME_TYPE_OTHER')]
	],
	VmeStatuses:[ 
		[0, FigisMap.label("VME_STATUS_UNKNOWN")],
		[1, FigisMap.label("VME_STATUS_ENS")],
		[2, FigisMap.label("VME_STATUS_UNDEST")],
		[3, FigisMap.label("VME_STATUS_RISK")],
		[4, FigisMap.label("VME_STATUS_VOL")],
		[5, FigisMap.label("VME_STATUS_EXP")],
		[6, FigisMap.label("VME_STATUS_POT")],
		[7, FigisMap.label("VME_STATUS_TEMP")]
		
	],
	years : (function(){var currentTime = new Date();var now=currentTime.getFullYear();var year=2000;var ret=[];while(year<=now){ret.push([now]);now--;}return ret;})() 

};



/**
 * Stores for data for Vme components
 */
Vme.data.stores = {
	rfmoStore: new Ext.data.ArrayStore({
		fields: [
			'id',
            'name',
				
        ],
		data: Vme.data.models.rfmos
	}),
	areaTypeStore:  new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'id',
            'displayText'
        ],
		data: Vme.data.models.areaTypes
        
    }),
	VmeStatusStore: new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'id',
            'displayText'
        ],
		data: Vme.data.models.VmeStatuses

    }),
	yearStore:  new Ext.data.ArrayStore({id:0,data: Vme.data.models.years,fields:['year']}),
	
	SearchResultStore:new Ext.ux.LazyJsonStore({
		//combo:this,
		method:'GET',
		
		root:'features',
		messageProperty: 'crs',
		autoLoad: false,
		fields: [
			{name: 'id', mapping: 'fid'},
			{name: 'geometry', mapping: 'geometry'},
			{name: 'localname',  mapping: 'properties.LOCAL_NAME'},
			{name: 'bbox',		mapping: 'properties.bbox'},
			{name: 'vme_id',     mapping: 'properties.VME_ID'},
			{name: 'status', 	 mapping: 'properties.STATUS'},
			{name: 'year', mapping: 'properties.YEAR'},
			{name: 'type', mapping: 'properties.VME_TYPE'},
			{name: 'owner', mapping: 'properties.OWNER'},
			{name: 'geo_ref', mapping: 'properties.GEO_AREA'}
			
			
		],
		url: 'http://office.geo-solutions.it/figis/geoserver/fifao/ows',
		recordId: 'fid',
		paramNames:{
			start: "startindex",
			limit: "maxfeatures",
			sort: "sortBy"
		},
		baseParams:{
			service:'WFS',
			version:'1.0.0',
			request:'GetFeature',
			typeName: 'fifao:Vme2',
			outputFormat:'json',
			sortBy: 'VME_ID',
			srs:'EPSG:4326'
			
		
		},
		listeners:{
			beforeload: function(store){
				
			
			}
		}
		
		
		
	}),
	EncountersStore:new Ext.ux.LazyJsonStore({
		//combo:this,
		method:'GET',
		
		root:'features',
		messageProperty: 'crs',
		autoLoad: false,
		fields: [
			{name: 'id', mapping: 'fid'},
			{name: 'geometry', mapping: 'geometry'},
			{name: 'bbox',		mapping: 'properties.bbox'},
			{name: 'vme_id',     mapping: 'properties.VME_ID'},
			{name: 'taxa', 	 mapping: 'properties.TAXA'},
			{name: 'QUANTITY', mapping: 'properties.QUANTITY'},
			{name: 'unit', mapping: 'properties.UNIT'}

		],
		url: 'http://office.geo-solutions.it/figis/geoserver/fifao/ows',
		recordId: 'fid',
		paramNames:{
			start: "startindex",
			limit: "maxfeatures",
			sort: "sortBy"
		},
		baseParams:{
			service:'WFS',
			version:'1.0.0',
			request:'GetFeature',
			typeName: 'fifao:Encounters2',
			outputFormat:'json',
			sortBy: 'VME_ID',
			srs:'EPSG:4326'
			
		
		},
		listeners:{
			beforeload: function(store){
				
			
			}
		}
	}),
	SurveyDataStore:new Ext.ux.LazyJsonStore({
		//combo:this,
		method:'GET',
		
		root:'features',
		messageProperty: 'crs',
		autoLoad: false,
		fields: [
			{name: 'id', mapping: 'fid'},
			{name: 'geometry', mapping: 'geometry'},
			{name: 'bbox',		mapping: 'properties.bbox'},
			{name: 'vme_id',     mapping: 'properties.VME_ID'},
			{name: 'taxa', 	 mapping: 'properties.TAXA'},
			{name: 'QUANTITY', mapping: 'properties.QUANTITY'},
			{name: 'unit', mapping: 'properties.UNIT'}

		],
		url: 'http://office.geo-solutions.it/figis/geoserver/fifao/ows',
		recordId: 'fid',
		paramNames:{
			start: "startindex",
			limit: "maxfeatures",
			sort: "sortBy"
		},
		baseParams:{
			service:'WFS',
			version:'1.0.0',
			request:'GetFeature',
			typeName: 'fifao:SurveyData',
			outputFormat:'json',
			sortBy: 'VME_ID',
			srs:'EPSG:4326'
			
		
		},
		listeners:{
			beforeload: function(store){
				
			
			}
		}
	})

}