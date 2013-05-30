(function($){
/*
 ****************************************
 *** twinklestub.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Stub")
 * Active on:              Existing articles
 * Config directives in:   FriendlyConfig
 * Note:				   customised friendlytag module (for SEWP)
 */

Twinkle.stub = function friendlytag() {
	// redirect tagging
	if( Morebits.wiki.isPageRedirect() ) {
		Twinkle.stub.mode = 'redirect';
	}
	// file tagging
	else if( mw.config.get('wgNamespaceNumber') === 6 && !document.getElementById("mw-sharedupload") && document.getElementById("mw-imagepage-section-filehistory") ) {
		Twinkle.stub.mode = 'file';
	}
	// article/draft article tagging
	else if( ( mw.config.get('wgNamespaceNumber') === 0 || /^Wikipedia([ _]talk)?\:Requested[ _]pages\//.exec(mw.config.get('wgPageName')) ) && mw.config.get('wgCurRevisionId') ) {
		Twinkle.stub.mode = 'article';
		twAddPortletLink( Twinkle.stub.callback, "Stub", "friendly-tag", "Add stub tags to article" );
	}
};

Twinkle.stub.callback = function friendlytagCallback( uid ) {
	var Window = new Morebits.simpleWindow( 630, (Twinkle.stub.mode === "article") ? 450 : 400 );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Simple Stub project", "Wikipedia:Simple Stub Project" );
	Window.addFooterLink( "Stub guideline", "Wikipedia:Stub" );
	Window.addFooterLink( "Twinkle help", "WP:TW/DOC#stub" );

	var form = new Morebits.quickForm( Twinkle.stub.callback.evaluate );

	switch( Twinkle.stub.mode ) {
		case 'article':
			Window.setTitle( "Article stub tagging" );

			form.append({
				type: 'select',
				name: 'sortorder',
				label: 'View this list:',
				tooltip: 'You can change the default view order in your Twinkle preferences (WP:TWPREFS).',
				event: Twinkle.stub.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: 'By categories', selected: Twinkle.getFriendlyPref('stubArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: 'In alphabetical order', selected: Twinkle.getFriendlyPref('stubArticleSortOrder') === 'alpha' }
				]
			});

			form.append( { type: 'div', id: 'tagWorkArea' } );
	}

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	if (Twinkle.stub.mode === "article") {
		// fake a change event on the sort dropdown, to initialize the tag list
		var evt = document.createEvent("Event");
		evt.initEvent("change", true, true);
		result.sortorder.dispatchEvent(evt);
	}
};

Twinkle.stub.checkedTags = [];

Twinkle.stub.updateSortOrder = function(e) {
	var sortorder = e.target.value;
	var $workarea = $(e.target.form).find("div#tagWorkArea");

	Twinkle.stub.checkedTags = e.target.form.getChecked("articleTags");
	if (!Twinkle.stub.checkedTags) {
		Twinkle.stub.checkedTags = [];
	}

	// function to generate a checkbox, with appropriate subgroup if needed
	var makeCheckbox = function(tag, description) {
		var checkbox = { value: tag, label: "{{" + tag + "}}: " + description };
		if (Twinkle.stub.checkedTags.indexOf(tag) !== -1) {
			checkbox.checked = true;
		}

		return checkbox;
	};

	// categorical sort order
	if (sortorder === "cat") {
		var div = new Morebits.quickForm.element({
			type: "div",
			id: "tagWorkArea"
		});

		// function to iterate through the tags and create a checkbox for each one
		var doCategoryCheckboxes = function(subdiv, array) {
			var checkboxes = [];
			$.each(array, function(k, tag) {
				var description = Twinkle.stub.article.tags[tag];
				checkboxes.push(makeCheckbox(tag, description));
			});
			subdiv.append({
				type: "checkbox",
				name: "articleTags",
				list: checkboxes
			});
		};

		var i = 0;
		// go through each category and sub-category and append lists of checkboxes
		$.each(Twinkle.stub.article.tagCategories, function(title, content) {
			div.append({ type: "header", id: "tagHeader" + i, label: title });
			var subdiv = div.append({ type: "div", id: "tagSubdiv" + i++ });
			if ($.isArray(content)) {
				doCategoryCheckboxes(subdiv, content);
			} else {
				$.each(content, function(subtitle, subcontent) {
					subdiv.append({ type: "div", label: [ Morebits.htmlNode("b", subtitle) ] });
					doCategoryCheckboxes(subdiv, subcontent);
				});
			}
		});

		var rendered = div.render();
		$workarea.replaceWith(rendered);
		var $rendered = $(rendered);
		$rendered.find("h5").css({ 'font-size': '110%', 'margin-top': '1em' });
		$rendered.find("div").filter(":has(span.quickformDescription)").css({ 'margin-top': '0.4em' });
	}
	// alphabetical sort order
	else {
		var checkboxes = [];
		$.each(Twinkle.stub.article.tags, function(tag, description) {
			checkboxes.push(makeCheckbox(tag, description));
		});
		var tags = new Morebits.quickForm.element({
			type: "checkbox",
			name: "articleTags",
			list: checkboxes
		});
		$workarea.empty().append(tags.render());
	}
};


// Tags for ARTICLES start here

Twinkle.stub.article = {};

// A list of all article tags, in alphabetical order
// To ensure tags appear in the default "categorized" view, add them to the tagCategories hash below.

Twinkle.stub.article.tags = {
	"actor-stub": "for use with articles about actors",
	"asia-stub": "for use with anything about Asia, except people",
	"bio-stub": "for use with all people, no matter who or what profession",
	"biology-stub": "for use with topics related to biology",
	"chem-stub": "for use with topics related to chemistry",
	"europe-stub": "for use with anything about Europe, except people",
	"france-geo-stub": "for use with France geography topics",
	"food-stub": "for use with anything about food",
	"geo-stub": "for use with all geographical locations (places, towns, cities, etc)",
	"history-stub": "for use with history topics",
	"japan-stub": "for use with anything about Japan, except people",
	"japan-sports-bio-stub": "for use with Japanese sport biographies",
	"list-stub": "for use with lists only",
	"lit-stub": "for use with  all literature articles except people",
	"math-stub": "for use with topics related to mathematics",
	"med-stub": "for use with topics related to medicine",
	"military-stub": "for use with military related topics",
	"movie-stub": "for use with all movie articles except people",
	"music-stub": "for use with all music articles except people",
	"north-America-stub": "for use with anything about North America, except people",
	"performing-arts-stub": "general stub for the performing arts",
	"physics-stub": "for use with topics related to physics",
	"politics-stub": "for use with politics related topics",
	"religion-stub": "for use with religion related topics",
	"sci-stub": "anything science related (all branches and their tools)",
	"sport-stub": "general stub for all sports and sports items, not people",
	"sports-bio-stub": "for use with people who have sport as profession",
	"stub": "for all stubs that can not fit into any stub we have",
	"switzerland-stub": "for use with everything about Switzerland, except people",
	"tech-stub": "for use with technology related articles",
	"transport-stub": "for use with articles about any moving object (cars, bikes, ships, crafts, planes, rail, buses, trains, etc)",
	"tv-stub": "for use with all television articles except people",
	"UK-stub": "for use with anything about the United Kingdom, except people",
	"US-actor-stub": "for use with United States actor biographies",
	"US-bio-stub": "for use with United States biographies",
	"US-geo-stub": "for use with United States geography topics",
	"US-stub": "for use with anything about the United States, except people and geography",
	"video-game-stub": "for use with stubs related to video games",
	"weather-stub": "for articles about weather"
};

// A list of tags in order of category
// Tags should be in alphabetical order within the categories
// Add new categories with discretion - the list is long enough as is!

Twinkle.stub.article.tagCategories = {
		"Stub templates": [
			"stub",
			"list-stub"
		],
		"Countries & Geography": [
			"asia-stub",
			"europe-stub",
			"france-geo-stub",
			"geo-stub",
			"japan-stub",
			"japan-sports-bio-stub",
			"north-America-stub",
			"switzerland-stub",
			"UK-stub",
			"US-bio-stub",
			"US-geo-stub",
			"US-stub"
		],
		"Miscellaneous": [
			"food-stub",
			"history-stub",
			"military-stub",
			"politics-stub",
			"religion-stub",
			"transport-stub"
		],
		"People": [
			"actor-stub",
			"bio-stub",
			"japan-sports-bio-stub",
			"sports-bio-stub",
			"US-actor-stub",
			"US-bio-stub"
		],
		"Science": [
			"biology-stub",
			"chem-stub",
			"math-stub",
			"med-stub",
			"physics-stub",
			"sci-stub",
			"weather-stub"
		],
		"Sports": [
			"japan-sports-bio-stub",
			"sport-stub",
			"sports-bio-stub"

		],
		"Technology": [
			"tech-stub",
			"video-game-stub"
		],
		"Arts": [
			"actor-stub",
			"lit-stub",
			"movie-stub",
			"music-stub",
			"performing-arts-stub",
			"tv-stub",
			"US-actor-stub"
		]
}

// Tags for REDIRECTS start here



// Contains those article tags that *do not* work inside {{multiple issues}}.
Twinkle.stub.multipleIssuesExceptions = [
	'cat improve',
	'in use',
	'merge',
	'merge from',
	'merge to',
	'not English',
	'rough translation',
	'uncat',
	'under construction',
	'update'
];


Twinkle.stub.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters(),
		    tagRe, tagText = '', summaryText = 'Added',
		    tags = [], groupableTags = [], i, totalTags;

		// Remove tags that become superfluous with this action
		var pageText = pageobj.getPageText();

		var addTag = function friendlytagAddTag( tagIndex, tagName ) {
			var currentTag = "";

			pageText += '\n\n{{' + tagName + '}}';

			if ( tagIndex > 0 ) {
				if( tagIndex === (totalTags - 1) ) {
					summaryText += ' and';
				} else if ( tagIndex < (totalTags - 1) ) {
					summaryText += ',';
				}
			}

			summaryText += ' {{[[';
			summaryText += (tagName.indexOf(":") !== -1 ? tagName : ("Template:" + tagName + "|" + tagName));
			summaryText += ']]}}';
		};

			// Check for preexisting tags and separate tags into groupable and non-groupable arrays
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im' );
				if( !tagRe.exec( pageText ) ) {
					if( Twinkle.stub.multipleIssuesExceptions.indexOf(params.tags[i]) === -1 ) {
						groupableTags = groupableTags.concat( params.tags[i] );
					} else {
						tags = tags.concat( params.tags[i] );
					}
				} else {
					Morebits.status.info( 'Info', 'Found {{' + params.tags[i] +
						'}} on the article already...excluding' );
				}
			}

				tags = tags.concat( groupableTags );

		tags.sort();
		totalTags = tags.length;
		$.each(tags, addTag);

		summaryText += ( tags.length > 0 ? ' tag' + ( tags.length > 1 ? 's' : '' ) : '' ) +
			' to ' + Twinkle.stub.mode + Twinkle.getPref('summaryAd');

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText);
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchStubbedPages'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markStubbedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if( Twinkle.getFriendlyPref('markStubbedPagesAsPatrolled') ) {
			pageobj.patrol();
		}
	}
};

Twinkle.stub.callback.evaluate = function friendlytagCallbackEvaluate(e) {
	var form = e.target;
	var params = {};

	switch (Twinkle.stub.mode) {
		case 'article':
			params.tags = form.getChecked( 'articleTags' );
			params.group = false;
			params.notabilitySubcategory = form["articleTags.notability"] ? form["articleTags.notability"].value : null;
			break;
		case 'file':
			params.svgSubcategory = form["imageTags.svgCategory"] ? form["imageTags.svgCategory"].value : null;
			params.tags = form.getChecked( 'imageTags' );
			break;
		case 'redirect':
			params.tags = form.getChecked( 'redirectTags' );
			break;
	}

	if( !params.tags.length ) {
		alert( 'You must select at least one tag!' );
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "Tagging complete, reloading article in a few seconds";
	if (Twinkle.stub.mode === 'redirect') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "Tagging " + Twinkle.stub.mode);
	wikipedia_page.setCallbackParameters(params);
	switch (Twinkle.stub.mode) {
		case 'article':
			/* falls through */
		case 'redirect':
			wikipedia_page.load(Twinkle.stub.callbacks.main);
			return;
		case 'file':
			wikipedia_page.load(Twinkle.stub.callbacks.file);
			return;
	}
};
})(jQuery);
