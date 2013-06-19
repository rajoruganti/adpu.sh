var SearchModel = Backbone.Model.extend({
   performSearch: function(str) {
      //assign to local variable, so that it is accesible in callback's closure
	        var self = this; 
			var q = $("#q").val();
			console.log("performing search:"+q);
	        $.get('/docs/' + q, function(results) {
	            // are you sure it should be data?
	            console.log(results);
	            self.set("results", results);
	        });
   },
   _searchComplete: function(results) {
     this.set("searchResults", results);
   }
});

var DocList = Backbone.Collection.extend({

       // Will hold objects of the Service model
       model: SearchModel
   });

var SearchFormView = Backbone.View.extend({
	el:"#qform",
	events: {
      "submit": "getResults"
    },
    initialize: function(){
		_.bindAll(this, 'render', 'getResults');
		        this.collection = new DocList();
		        this.render();	
	},
	render: function() {
	        var self = this;
	        $(this.el).append("<button id='add'>get</button>");
	},
	

	
	getResults: function(e) {

		e.preventDefault();
		var q = $("#q").val();
		console.log("searching:"+q);
      // Get values of selected options, use them to construct Ajax query. 
      // Also toggle 'selected' CSS classes on selected inputs here?
      this.model.performSearch(q);
    }


});

var SearchResultsView = Backbone.View.extend({
    tagName: "div",
    id: "results-list",
	template: _.template($('#docsTemplate').html()),
    initialize: function() {
		_.bindAll(this, 'render');		
        this.model.on("change:results", this.displayResults, this);
    },
    displayResults: function(model, results) {
		//console.log(results);
		console.log("appending");
		results.each( function(model) {
			console.log(model);
		                        $("#results-list").append("<div>" + model.get('name') + "</div>");
		                    });
	//	$(this.el).html(this.template({ docs: results }));
	//	$(this.el).html($("#docTemplate")({docs:results}));
	//
	//	$(this.el).html($("#docTemplate").html({docs:results}));
		
	},

		
	 //       
	  //  }
	
/*
 		//append results to results-list here.   
		var docs = searchModel;
		console.log(this.el);
        $(this.el).html('<ul class="thumbnails"></ul>');
        for (var i = 1; i < 10; i++) {
			//console.log(docs[i]);
            $('.thumbnails', this.el).append(new DocListItemView({model: docs[i]}).render().el);
        }
	}
	*/
/*	render: function(){
		//_.bindAll(this, 'render');
		console.log(this.collection);
		var docs = this.collection.models[0].attributes; //actual response as the format is not the best
		console.log(docs);
		var template = _.template( $("#docs_template").html(), docs );
		this.$el.html( template );
		return this;
	}
*/
        
       
  });

var searchModel = new SearchModel();
var searchFormView = new SearchFormView({ model: searchModel });
var searchResultsView = new SearchResultsView({ model: searchModel });
console.log(searchFormView);

