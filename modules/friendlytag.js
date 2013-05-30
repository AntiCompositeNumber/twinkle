//<nowiki>


(function($){


/*
 ****************************************
 *** friendlytag.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Tag")
 * Active on:              Existing articles; file pages with a corresponding file
 *                         which is local (not on Commons); existing subpages of
 *                         {Wikipedia|Wikipedia talk}:Articles for creation;
 *                         all redirects
 * Config directives in:   FriendlyConfig
 */

Twinkle.tag = function friendlytag() {
	// redirect tagging
	if( Morebits.wiki.isPageRedirect() ) {
		Twinkle.tag.mode = 'redirect';
		Twinkle.addPortletLink( Twinkle.tag.callback, "Tag", "friendly-tag", "Tag redirect" );
	}
	// file tagging
	else if( mw.config.get('wgNamespaceNumber') === 6 && !document.getElementById("mw-sharedupload") && document.getElementById("mw-imagepage-section-filehistory") ) {
		Twinkle.tag.mode = 'file';
	}
	// article/draft article tagging
	else if( ( mw.config.get('wgNamespaceNumber') === 0 || /^Wikipedia([ _]talk)?\:Requested[ _]pages\//.exec(mw.config.get('wgPageName')) ) && mw.config.get('wgCurRevisionId') ) {
		Twinkle.tag.mode = 'article';
		Twinkle.addPortletLink( Twinkle.tag.callback, "Tag", "friendly-tag", "Add maintenance tags to article" );
	}
};

Twinkle.tag.callback = function friendlytagCallback( uid ) {
	var Window = new Morebits.simpleWindow( 630, (Twinkle.tag.mode === "article") ? 450 : 400 );
	Window.setScriptName( "Twinkle" );
	// anyone got a good policy/guideline/info page/instructional page link??
	Window.addFooterLink( "Twinkle help", "WP:TW/DOC#tag" );

	var form = new Morebits.quickForm( Twinkle.tag.callback.evaluate );

	switch( Twinkle.tag.mode ) {
		case 'article':
			Window.setTitle( "Article maintenance tagging" );

			form.append( {
					type: 'checkbox',
					list: [
						{
							label: 'Group inside {{multiple issues}} if possible',
							value: 'group',
							name: 'group',
							tooltip: 'If applying three or more templates supported by {{multiple issues}} and this box is checked, all supported templates will be grouped inside a {{multiple issues}} template.',
							checked: Twinkle.getFriendlyPref('groupByDefault')
						}
					]
				}
			);

			form.append({
				type: 'select',
				name: 'sortorder',
				label: 'View this list:',
				tooltip: 'You can change the default view order in your Twinkle preferences (WP:TWPREFS).',
				event: Twinkle.tag.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: 'By categories', selected: Twinkle.getFriendlyPref('tagArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: 'In alphabetical order', selected: Twinkle.getFriendlyPref('tagArticleSortOrder') === 'alpha' }
				]
			});

			form.append( { type: 'div', id: 'tagWorkArea' } );

			if( Twinkle.getFriendlyPref('customTagList').length ) {
				form.append( { type: 'header', label: 'Custom tags' } );
				form.append( { type: 'checkbox', name: 'articleTags', list: Twinkle.getFriendlyPref('customTagList') } );
			}
			break;

		case 'redirect':
			Window.setTitle( "Redirect tagging" );
	//Spelling, misspelling, tense and capitalization templates
			form.append({ type: 'header', label:'All templates' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.spellingList });
			break;

		default:
			alert("Twinkle.tag: unknown mode " + Twinkle.tag.mode);
			break;
	}

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	if (Twinkle.tag.mode === "article") {
		// fake a change event on the sort dropdown, to initialize the tag list
		var evt = document.createEvent("Event");
		evt.initEvent("change", true, true);
		result.sortorder.dispatchEvent(evt);
	}
};

Twinkle.tag.checkedTags = [];

Twinkle.tag.updateSortOrder = function(e) {
	var sortorder = e.target.value;
	var $workarea = $(e.target.form).find("div#tagWorkArea");

	Twinkle.tag.checkedTags = e.target.form.getChecked("articleTags");
	if (!Twinkle.tag.checkedTags) {
		Twinkle.tag.checkedTags = [];
	}

	// function to generate a checkbox, with appropriate subgroup if needed
	var makeCheckbox = function(tag, description) {
		var checkbox = { value: tag, label: "{{" + tag + "}}: " + description };
		if (Twinkle.tag.checkedTags.indexOf(tag) !== -1) {
			checkbox.checked = true;
		}
		
		if (tag === "notability") {
			checkbox.subgroup = {
				name: 'notability',
				type: 'select',
				list: [
					{ label: "{{notability}}: article\'s subject may not meet the general notability guideline", value: "none" },
					{ label: "{{notability|Academics}}: notability guideline for academics", value: "Academics" },
					{ label: "{{notability|Biographies}}: notability guideline for biographies", value: "Biographies" },
					{ label: "{{notability|Books}}: notability guideline for books", value: "Books" },
					{ label: "{{notability|Companies}}: notability guidelines for companies and organizations", value: "Companies" },
					{ label: "{{notability|Events}}: notability guideline for events", value: "Events" },
					{ label: "{{notability|Films}}: notability guideline for films", value: "Films" },
					{ label: "{{notability|Music}}: notability guideline for music", value: "Music" },
					{ label: "{{notability|Neologisms}}: notability guideline for neologisms", value: "Neologisms" },
					{ label: "{{notability|Numbers}}: notability guideline for numbers", value: "Numbers" },
					{ label: "{{notability|Products}}: notability guideline for products and services", value: "Products" },
					{ label: "{{notability|Sport}}: notability guideline for sports and athletics", value: "Sport" },
					{ label: "{{notability|Web}}: notability guideline for web content", value: "Web" }
				]
			};
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
				var description = Twinkle.tag.article.tags[tag];
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
		$.each(Twinkle.tag.article.tagCategories, function(title, content) {
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
		$.each(Twinkle.tag.article.tags, function(tag, description) {
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

Twinkle.tag.article = {};

// A list of all article tags, in alphabetical order
// To ensure tags appear in the default "categorized" view, add them to the tagCategories hash below.

Twinkle.tag.article.tags = {
	"advertisement": "article is written like an advertisement",
	"autobiography": "article is an autobiography and may not be written neutrally",
	"BLP sources": "BLP article needs more sources for verification",
	"BLP unsourced": "BLP article has no sources at all",
	"citation style": "article has unclear or inconsistent inline citations",
	"cleanup": "article may require cleanup",
	"COI": "article creator or major contributor may have a conflict of interest",
	"complex": "the English used in this article or section may not be easy for everybody to understand",
	"confusing": "article may be confusing or unclear",
	"context": "article provides insufficient context",
	"copyedit": "article needs copy editing for grammar, style, cohesion, tone, and/or spelling",
	"dead end": "article has few or no links to other articles",
	"disputed": "article has questionable factual accuracy",
	"expert-subject": "article needs attention from an expert on the subject",
	"external links": "article's external links may not follow content policies or guidelines",
	"fansite": "article resembles a fansite",
	"fiction": "article fails to distinguish between fact and fiction",
	"globalise": "article may not represent a worldwide view of the subject",
	"hoax": "article may be a complete hoax",
	"in-universe": "article subject is fictional and needs rewriting from a non-fictional perspective",
	"in use": "article is undergoing a major edit for a short while",
	"intro-missing": "article has no lead section and one should be written",
	"intro-rewrite": "article lead section needs to be rewritten",
	"intro-tooshort": "article lead section is too short and should be expanded",
	"jargon": "article uses technical words that not everybody will know",
	"link rot": "article uses bare URLs for references, which are prone to link rot",
	"merge": "article should be merged with another given article",
	"metricate": "article exclusively uses non-SI units of measurement",
	"more footnotes": "article has some references, but insufficient in-text citations",
	"more sources": "article needs more sources for verification",
	"no footnotes": "article has references, but no in-text citations",
	"no sources": "article has no references at all",
	"notability": "article's subject may not meet the notability guideline",
	"NPOV": "article does not maintain a neutral point of view",
	"one source": "article relies largely or entirely upon a single source",
	"original research": "article has original research or unverified claims",
	"orphan": "article is linked to from no other articles",
	"plot": "plot summary in article is too long",
	"primary sources": "article relies too heavily on first-hand sources, and needs third-party sources",
	"prose": "article is in a list format that may be better presented using prose",
	"redlinks": "article may have too many red links",
	"restructure": "article may be in need of reorganization to comply with Wikipedia's layout guidelines",
	"rough translation": "article is poorly translated and needs cleanup",
	"sections": "article needs to be broken into sections",
	"self-published": "article may contain improper references to self-published sources",
	"tone": "tone of article is not appropriate",
	"uncat": "article is uncategorized",
	"under construction": "article is currently in the middle of an expansion or major revamping",
	"unreliable sources": "article's references may not be reliable sources",
	"update": "article needs additional up-to-date information added",
	"very long": "article is too long",
	"weasel": "article neutrality is compromised by the use of weasel words",
	"wikify": "article needs to be wikified"
};

// A list of tags in order of category
// Tags should be in alphabetical order within the categories
// Add new categories with discretion - the list is long enough as is!

Twinkle.tag.article.tagCategories = {
	"Cleanup and maintenance tags": {
		"General maintenance tags": [
			"cleanup",
			"complex",
			"copyedit",
			"wikify"
		],
		"Potentially unwanted content": [
			"external links"
		],
		"Structure, formatting, and lead section": [
			"intro-missing",
			"intro-rewrite",
			"intro-tooshort",
			"restructure",
			"sections",
			"very long"
		],
		"Fiction-related cleanup": [
			"fiction",
			"in-universe",
			"plot"
		]
	},
	"General content issues": {
		"Importance and notability": [
			"notability"  // has subcategories and special-cased code
		],
		"Style of writing": [
			"advertisement",
			"fansite",
			"jargon",
			"prose",
			"redlinks",
			"tone"
		],
		"Sense (or lack thereof)": [
			"confusing"
		],
		"Information and detail": [
			"context",
			"expert-subject",
			"metricate"
		],
		"Timeliness": [
			"update"
		],
		"Neutrality, bias, and factual accuracy": [
			"autobiography",
			"COI",
			"disputed",
			"hoax",
			"globalise",
			"NPOV",
			"weasel"
		],
		"Verifiability and sources": [
			"BLP sources",
			"BLP unsourced",
			"more sources",
			"no sources",
			"one source",
			"original research",
			"primary sources",
			"self-published",
			"unreliable sources"
		]
	},
	"Specific content issues": {
		"Language": [
			"complex"			
		],
		"Links": [
			"dead end",
			"orphan",
			"wikify"  // this tag is listed twice because it used to focus mainly on links, but now it's a more general cleanup tag
		],
		"Referencing technique": [
			"citation style",
                        "link rot",
			"more footnotes",
			"no footnotes"
		],
		"Categories": [
			"uncat"
		]
	},
	"Merging": [
		"merge",
	],
	"Informational": [
		"in use",
		"under construction"
	]
};

// Tags for REDIRECTS start here

Twinkle.tag.spellingList = [
	{
		label: '{{R from capitalization}}: redirect from a from a capitalized title',
		value: 'R from capitalization' 
	},
	{
		label: '{{R with other capitalizations}}: redirect from a title with a different capitalization',
		value: 'R with other capitalizations' 
	},
	{
		label: '{{R from other name}}: redirect from a title with a different name',
		value: 'R from other name' 
	},
	{
		label: '{{R from other spelling}}: redirect from a title with a different spelling',
		value: 'R from other spelling' 
	},
	{
		label: '{{R from plural}}: redirect from a plural title',
		value: 'R from plural' 
	},
	{
		label: '{{R from related things}}: redirect related title',
		value: 'R from related things' 
	},
	{
		label: '{{R to section}}: redirect from a title for a "minor topic or title" to a comprehensive-type article section which covers the subject',
		value: 'R to section' 
	},
	{
		label: '{{R from shortcut}}: redirect to a Wikipedia "shortcut"',
		value: 'R from shortcut' 
	},
	{
		label: '{{R from title without diacritics}}: redirect to the article title with diacritical marks (accents, umlauts, etc.)',
		value: 'R from title without diacritics' 
	}
];


// Contains those article tags that *do not* work inside {{multiple issues}}.
Twinkle.tag.multipleIssuesExceptions = [
	'cat improve',
	'in use',
	'merge',
	'merge from',
	'merge to',
	'not English',
	'rough translation',
	'uncat',
	'under construction',
];


Twinkle.tag.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters(),
		    tagRe, tagText = '', summaryText = 'Added',
		    tags = [], groupableTags = [], i, totalTags
			
		var pageText = pageobj.getPageText();

		var addTag = function friendlytagAddTag( tagIndex, tagName ) {
			var currentTag = "";
			if( tagName === 'globalize' ) {
				currentTag += '{{' + params.globalizeSubcategory;
			} else {
				currentTag += ( Twinkle.tag.mode === 'redirect' ? '\n' : '' ) + '{{' + tagName;
			}

			if( tagName === 'notability' && params.notabilitySubcategory !== 'none' ) {
				currentTag += '|' + params.notabilitySubcategory;
			}

			// prompt for other parameters, based on the tag
			switch( tagName ) {
				case 'cleanup':
					var reason = prompt('"The specific problem is: "  \n' +
						"This information is optional. Just click OK if you don't wish to enter this.", "");
					if (reason === null) {
						Morebits.status.warn("Notice", "{{cleanup}} tag skipped by user");
						return true;  // continue to next tag
					} else {
						currentTag += '|reason=' + reason;
					}
					break;
				case 'complex':
					var cpreason = prompt('"An editor’s reason for this is:"  (e.g. "words like XX")  \n' +
						"Just click OK if you don't wish to enter this.  To skip the {{complex}} tag, click Cancel.", "");
					if (cpreason === null) {
						return true;  // continue to next tag
					} else if (cpreason !== "") {
						currentTag += '|2=' + cpreason;
					}
					break;
				case 'copyedit':
					var cereason = prompt('"This article may require copy editing for..."  (e.g. "consistent spelling")  \n' +
						"Just click OK if you don't wish to enter this.  To skip the {{copyedit}} tag, click Cancel.", "");
					if (cereason === null) {
						return true;  // continue to next tag
					} else if (cereason !== "") {
						currentTag += '|for=' + cereason;
					}
					break;	
				case 'expert-subject':
					var esreason = prompt('"This is because..."  \n' +
						"This information is optional.  To skip the {{expert-subject}} tag, click Cancel.", "");
					if (esreason === null) {
						return true;  // continue to next tag
					} else if (esreason !== "") {
						currentTag += '|1=' + esreason;
					}
					break;
				case 'not English':
					var langname = prompt('Please enter the name of the language the article is thought to be written in.  \n' +
						"Just click OK if you don't know.  To skip the {{not English}} tag, click Cancel.", "");
					if (langname === null) {
						return true;  // continue to next tag
					} else if (langname !== "") {
						currentTag += '|1=' + langname;
					}
					break;
				case 'rough translation':
					var roughlang = prompt('Please enter the name of the language the article is thought to have been translated from.  \n' +
						"Just click OK if you don't know.  To skip the {{rough translation}} tag, click Cancel.", "");
					if (roughlang === null) {
						return true;  // continue to next tag
					} else if (roughlang !== "") {
						currentTag += '|1=' + roughlang;
					}
					break;
				case 'wikify':
					var wreason = prompt('You can optionally enter a more specific reason why the article needs to be wikified: This article needs to be wikified. {{{Your reason here}}}  \n' +
						"Just click OK if you don't wish to enter this.  To skip the {{wikify}} tag, click Cancel.", "");
					if (wreason === null) {
						return true;  // continue to next tag
					} else if (wreason !== "") {
						currentTag += '|reason=' + wreason;
					}
					break;
				case 'merge':
				case 'merge to':
				case 'merge from':
					var param = prompt('Please enter the name of the other article(s) involved in the merge.  \n' +
						"To specify multiple articles, separate them with a vertical pipe (|) character.  \n" +
						"This information is required.  Click OK when done, or click Cancel to skip the merge tag.", "");
					if (param === null) {
						return true;  // continue to next tag
					} else if (param !== "") {
						currentTag += '|' + param;
					}
					break;
				default:
					break;
			}

				currentTag += (Twinkle.tag.mode === 'redirect') ? '}}' : '|date={{subst:CURRENTMONTHNAME}} {{subst:CURRENTYEAR}}}}\n';
				tagText += currentTag;

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

		if( Twinkle.tag.mode !== 'redirect' ) {
			// Check for preexisting tags and separate tags into groupable and non-groupable arrays
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im' );
				if( !tagRe.exec( pageText ) ) {
					if( Twinkle.tag.multipleIssuesExceptions.indexOf(params.tags[i]) === -1 ) {
						groupableTags = groupableTags.concat( params.tags[i] );
					} else {
						tags = tags.concat( params.tags[i] );
					}
				} else {
					Morebits.status.info( 'Info', 'Found {{' + params.tags[i] +
						'}} on the article already...excluding' );
				}
			}

			if( params.group && groupableTags.length >= 3 ) {
				Morebits.status.info( 'Info', 'Grouping supported tags inside {{multiple issues}}' );

				groupableTags.sort();
				tagText += '{{multiple issues|\n';

				totalTags = groupableTags.length;
				$.each(groupableTags, addTag);

				summaryText += ' tags (within {{[[Template:multiple issues|multiple issues]]}})';
				if( tags.length > 0 ) {
					summaryText += ', and';
				}
				tagText += '}}\n';
			} else {
				tags = tags.concat( groupableTags );
			}
		} else {
			// Redirect tagging: Check for pre-existing tags
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im' );
				if( !tagRe.exec( pageText ) ) {
					tags = tags.concat( params.tags[i] );
				} else {
					Morebits.status.info( 'Info', 'Found {{' + params.tags[i] +
						'}} on the redirect already...excluding' );
				}
			}
		}

		tags.sort();
		totalTags = tags.length;
		$.each(tags, addTag);

		if( Twinkle.tag.mode === 'redirect' ) {
			pageText += tagText;
		} else {
			// smartly insert the new tags after any hatnotes. Regex is a bit more
			// complicated than it'd need to be, to allow templates as parameters,
			// and to handle whitespace properly.
			pageText = pageText.replace(/^\s*(?:((?:\s*\{\{\s*(?:about|correct title|dablink|distinguish|for|other\s?(?:hurricaneuses|people|persons|places|uses(?:of)?)|redirect(?:-acronym)?|see\s?(?:also|wiktionary)|selfref|the)\d*\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\})+(?:\s*\n)?)\s*)?/i,
				"$1" + tagText);
		}
		summaryText += ( tags.length > 0 ? ' tag' + ( tags.length > 1 ? 's' : '' ) : '' ) +
			' to ' + Twinkle.tag.mode + Twinkle.getPref('summaryAd');

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText);
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if( Twinkle.getFriendlyPref('markTaggedPagesAsPatrolled') ) {
			pageobj.patrol();
		}
	},

	file: function friendlytagCallbacksFile(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();
		var summary = "Adding ";

		// Add maintenance tags
		if (params.tags.length) {

			var tagtext = "", currentTag;
			$.each(params.tags, function(k, tag) {

				currentTag += "}}\n";

				tagtext += currentTag;
				summary += "{{" + tag + "}}, ";

				return true;  // continue
			});

			if (!tagtext) {
				pageobj.getStatusElement().warn("User canceled operation; nothing to do");
				return;
			}

			text = tagtext + text;
		}

		pageobj.setPageText(text);
		pageobj.setEditSummary(summary.substring(0, summary.length - 2) + Twinkle.getPref('summaryAd'));
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();

		if( Twinkle.getFriendlyPref('markTaggedPagesAsPatrolled') ) {
			pageobj.patrol();
		}
	}
};

Twinkle.tag.callback.evaluate = function friendlytagCallbackEvaluate(e) {
	var form = e.target;
	var params = {};

	switch (Twinkle.tag.mode) {
		case 'article':
			params.tags = form.getChecked( 'articleTags' );
			params.group = form.group.checked;
			params.notabilitySubcategory = form["articleTags.notability"] ? form["articleTags.notability"].value : null;
			break;
		case 'file':
			params.svgSubcategory = form["imageTags.svgCategory"] ? form["imageTags.svgCategory"].value : null;
			params.tags = form.getChecked( 'imageTags' );
			break;
		case 'redirect':
			params.tags = form.getChecked( 'redirectTags' );
			break;
		default:
			alert("Twinkle.tag: unknown mode " + Twinkle.tag.mode);
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
	if (Twinkle.tag.mode === 'redirect') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "Tagging " + Twinkle.tag.mode);
	wikipedia_page.setCallbackParameters(params);
	switch (Twinkle.tag.mode) {
		case 'article':
			/* falls through */
		case 'redirect':
			wikipedia_page.load(Twinkle.tag.callbacks.main);
			return;
		case 'file':
			wikipedia_page.load(Twinkle.tag.callbacks.file);
			return;
		default:
			alert("Twinkle.tag: unknown mode " + Twinkle.tag.mode);
			break;
	}
};
})(jQuery);


//</nowiki>
