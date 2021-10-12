/*
 ****************************************
 *** friendlywelcome.js: Welcome module
 ****************************************
 * Mode of invocation:     Tab ("Wel"), or from links on diff pages
 * Active on:              Existing user talk pages, diff pages
 * Config directives in:   FriendlyConfig
 */

Twinkle.welcome = function friendlywelcome() {
	if( Morebits.queryString.exists( 'friendlywelcome' ) ) {
		if( Morebits.queryString.get( 'friendlywelcome' ) === 'auto' ) {
			Twinkle.welcome.auto();
		} else {
			Twinkle.welcome.semiauto();
		}
	} else {
		Twinkle.welcome.normal();
	}
};

Twinkle.welcome.auto = function() {
	if( Morebits.queryString.get( 'action' ) !== 'edit' ) {
		// userpage not empty, aborting auto-welcome
		return;
	}

	Twinkle.welcome.welcomeUser();
};

Twinkle.welcome.semiauto = function() {
	Twinkle.welcome.callback( mw.config.get( 'wgTitle' ).split( '/' )[0].replace( /\"/, "\\\"") );
};

Twinkle.welcome.normal = function() {
	if( Morebits.queryString.exists( 'diff' ) ) {
		// check whether the contributors' talk pages exist yet
		var $oList = $("#mw-diff-otitle2").find("span.mw-usertoollinks a.new:contains(talk)").first();
		var $nList = $("#mw-diff-ntitle2").find("span.mw-usertoollinks a.new:contains(talk)").first();

		if( $oList.length > 0 || $nList.length > 0 ) {
			var spanTag = function( color, content ) {
				var span = document.createElement( 'span' );
				span.style.color = color;
				span.appendChild( document.createTextNode( content ) );
				return span;
			};

			var welcomeNode = document.createElement('strong');
			var welcomeLink = document.createElement('a');
			welcomeLink.appendChild( spanTag( 'Black', '[' ) );
			welcomeLink.appendChild( spanTag( 'Goldenrod', 'welcome' ) );
			welcomeLink.appendChild( spanTag( 'Black', ']' ) );
			welcomeNode.appendChild(welcomeLink);

			if( $oList.length > 0 ) {
				var oHref = $oList.attr("href");

				var oWelcomeNode = welcomeNode.cloneNode( true );
				oWelcomeNode.firstChild.setAttribute( 'href', oHref + '&' + Morebits.queryString.create( { 'friendlywelcome': Twinkle.getFriendlyPref('quickWelcomeMode')==='auto'?'auto':'norm' } ) + '&' + Morebits.queryString.create( { 'vanarticle': mw.config.get( 'wgPageName' ).replace(/_/g, ' ') } ) );
				$oList[0].parentNode.parentNode.appendChild( document.createTextNode( ' ' ) );
				$oList[0].parentNode.parentNode.appendChild( oWelcomeNode );
			}

			if( $nList.length > 0 ) {
				var nHref = $nList.attr("href");

				var nWelcomeNode = welcomeNode.cloneNode( true );
				nWelcomeNode.firstChild.setAttribute( 'href', nHref + '&' + Morebits.queryString.create( { 'friendlywelcome': Twinkle.getFriendlyPref('quickWelcomeMode')==='auto'?'auto':'norm' } ) + '&' + Morebits.queryString.create( { 'vanarticle': mw.config.get( 'wgPageName' ).replace(/_/g, ' ') } ) );
				$nList[0].parentNode.parentNode.appendChild( document.createTextNode( ' ' ) );
				$nList[0].parentNode.parentNode.appendChild( nWelcomeNode );
			}
		}
	}
	if( mw.config.get( 'wgNamespaceNumber' ) === 3 ) {
		var username = mw.config.get( 'wgTitle' ).split( '/' )[0].replace( /\"/, "\\\""); // only first part before any slashes
		twAddPortletLink( function(){ Twinkle.welcome.callback(username); }, "Wel", "friendly-welcome", "Welcome user" );
	}
};

Twinkle.welcome.welcomeUser = function welcomeUser() {
	Morebits.status.init( document.getElementById('bodyContent') );

	var params = {
		value: Twinkle.getFriendlyPref('quickWelcomeTemplate'),
		article: Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '',
		mode: 'auto'
	};

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "Welcoming complete, reloading talk page in a few seconds";

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "User talk page modification");
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.welcome.callbacks.main);
};

Twinkle.welcome.callback = function friendlywelcomeCallback( uid ) {
	if( uid === mw.config.get('wgUserName') && !confirm( 'Are you really sure you want to welcome yourself?...' ) ){
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 420 );
	Window.setTitle( "Welcome user" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Twinkle help", "WP:TW/DOC#welcome" );

	var form = new Morebits.quickForm( Twinkle.welcome.callback.evaluate );

	form.append({
			type: 'select',
			name: 'type',
			label: 'Type of welcome: ',
			event: Twinkle.welcome.populateWelcomeList,
			list: [
				{ type: 'option', value: 'standard', label: 'Standard welcomes', selected: !Morebits.isIPAddress(mw.config.get('wgTitle')) },
				{ type: 'option', value: 'anonymous', label: 'Problem user welcomes', selected: Morebits.isIPAddress(mw.config.get('wgTitle')) }
			]
		});

	form.append( { type: 'div', id: 'welcomeWorkArea' } );

	form.append( {
			type: 'input',
			name: 'article',
			label: '* Linked article (if supported by template):',
			value:( Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '' ),
			tooltip: 'An article might be linked from within the welcome if the template supports it. Leave empty for no article to be linked.  Templates that support a linked article are marked with an asterisk.'
		} );

	var previewlink = document.createElement( 'a' );
	$(previewlink).click(function(){
		Twinkle.welcome.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = "pointer";
	previewlink.textContent = 'Preview';
	form.append( { type: 'div', name: 'welcomepreview', label: [ previewlink ] } );

	form.append( { type: 'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// initialize the welcome list
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.type.dispatchEvent( evt );
};

Twinkle.welcome.populateWelcomeList = function(e) {
	var type = e.target.value;
	var $workarea = $(e.target.form).find("div#welcomeWorkArea");

	var div = new Morebits.quickForm.element({
		type: "div",
		id: "welcomeWorkArea"
	});

	if ((type === "standard" || type === "anonymous") && Twinkle.getFriendlyPref("customWelcomeList").length) {
		div.append({ type: 'header', label: 'Custom welcome templates' });
		div.append({
			type: 'radio',
			name: 'template',
			list: Twinkle.getFriendlyPref("customWelcomeList"),
			event: Twinkle.welcome.selectTemplate
		});
	}

	var appendTemplates = function(list) {
		div.append({
			type: 'radio',
			name: 'template',
			list: list.map(function(obj) {
				var properties = Twinkle.welcome.templates[obj];
				var result = (properties ? {
					value: obj,
					label: "{{" + obj + "}}: " + properties.description + (properties.linkedArticle ? "\u00A0*" : ""),  // U+00A0 NO-BREAK SPACE
					tooltip: properties.tooltip  // may be undefined
				} : {
					value: obj,
					label: "{{" + obj + "}}"
				});
				return result;
			}),
			event: Twinkle.welcome.selectTemplate
		});
	};

	switch (type) {
		case "standard":
			div.append({ type: 'header', label: 'General welcome templates' });
			appendTemplates([
				"welcome",
				"welcome2",
				"welcome-anon",
				"welcome-anon2",
				"welcome-en",
				"welcome-iw",
				"welcomeg",
				"welcomeq",
				"welcome-personal",
				"welcome-school"
			]);
			break;
		case "anonymous":
			div.append({ type: 'header', label: 'Problem user welcome templates' });
			appendTemplates([
				"firstarticle",
				"welcomespam",
				"welcomenpov",
				"welcomevandal"
			]);
			break;
		default:
			div.append({ type: 'div', label: 'Twinkle.welcome.populateWelcomeList: something went wrong' });
			break;
	}

	var rendered = div.render();
	rendered.className = "quickform-scrollbox";
	$workarea.replaceWith(rendered);

	var firstRadio = e.target.form.template[0];
	firstRadio.checked = true;
	Twinkle.welcome.selectTemplate({ target: firstRadio });
};

Twinkle.welcome.selectTemplate = function(e) {
	var properties = Twinkle.welcome.templates[e.target.values];
	e.target.form.article.disabled = (properties ? !properties.linkedArticle : false);
};


// A list of welcome templates and their properties and syntax

// The four fields that are available are "description", "linkedArticle", "syntax", and "tooltip".
// The three magic words that can be used in the "syntax" field are:
//   - $USERNAME$  - replaced by the welcomer's username, depending on user's preferences
//   - $ARTICLE$   - replaced by an article name, if "linkedArticle" is true
//   - $HEADER$    - adds a level 2 header (most templates already include this)

Twinkle.welcome.templates = {
	"welcome": {
		description: "standard plain text welcome",
		linkedArticle: true,
		syntax: "$HEADER$ {{subst:welcome|$USERNAME$|art=$ARTICLE$}} ~~~~"
	},
	"welcome2": {
		description: "welcome with graphic and orange color sheme",
		linkedArticle: true,
		syntax: "$HEADER$ {{subst:welcome2|~~~~|art=$ARTICLE$}}"
	},
	"welcome-anon": {
		description: "welcome anonymous user and suggest getting a username",
		linkedArticle: true,
		syntax: "$HEADER$ {{subst:welcome-anon|$USERNAME$|art=$ARTICLE$}} ~~~~"
	},
	"welcome-anon2": {
		description: "like welcome-anon, but with table and colors",
		linkedArticle: true,
		syntax: "$HEADER$ {{subst:welcome-anon2|$USERNAME$|art=$ARTICLE$}}"
	},
	"welcome-en": {
		description: "welcome for users from main English Wikipedia",
		linkedArticle: false,
		syntax: "$HEADER$ {{subst:welcome-en}} ~~~~"
	},
	"welcome-iw": {
		description: "welcome users from another Wikipedia",
		linkedArticle: false,
		syntax: "$HEADER$ {{subst:welcome-iw}} ~~~~"
	},
	"welcomeg": {
		description: "welcome with blue background",
		linkedArticle: true,
		syntax: "{{subst:welcomeg|$USERNAME$|art=$ARTICLE$}} ~~~~"
	},
	"welcomeq": {
		description: "like welcomeg but a bit shorter",
		linkedArticle: true,
		syntax: "{{subst:welcomeq|$USERNAME$|art=$ARTICLE$}} ~~~~"
	},
	"welcome-personal": {
		description: "a more personal welcome with a plate of cookies",
		linkedArticle: true,
		syntax: "{{subst:welcome-personal|$USERNAME$|art=$ARTICLE$}} ~~~~"
	},
	"welcome-school": {
		description: "for welcoming students participating in a class project",
		linkedArticle: false,
		syntax: "{{subst:welcome-school}} ~~~~"
	},

	// second group

	"firstarticle": {
		description: "welcome with note that created page may get deleted",
		linkedArticle: true,
		syntax: "$HEADER$ {{subst:firstarticle|1=$ARTICLE$}} ~~~~"
	},
	"welcomespam": {
		description: "welcome users which did spam changes",
		linkedArticle: true,
		syntax: "$HEADER$ {{subst:welcomespam|art=$ARTICLE$}} ~~~~"
	},
	"welcomenpov": {
		description: "welcome with warning to make changes that fit the NPOV requirements",
		linkedArticle: true,
		syntax: "$HEADER$ {{subst:welcomenpov|$ARTICLE$}} ~~~~"
	},
	"welcomevandal": {
		description: "welcome user which performed vandalism",
		linkedArticle: true,
		syntax: "$HEADER$ {{subst:welcomevandal|$ARTICLE$}} ~~~~"
	}
};

Twinkle.welcome.getTemplateWikitext = function(template, article) {
	var properties = Twinkle.welcome.templates[template];
	if (properties) {
		return properties.syntax.
			replace("$USERNAME$", Twinkle.getFriendlyPref("insertUsername") ? mw.config.get("wgUserName") : "").
			replace("$ARTICLE$", article ? article : "").
			replace(/\$HEADER\$\s*/, "== Welcome ==\n\n").
			replace("$EXTRA$", "");  // EXTRA is not implemented yet
	} else {
		return "{{subst:" + template + (article ? ("|art=" + article) : "") + "}} ~~~~";
	}
};

Twinkle.welcome.callbacks = {
	preview: function(form) {
		var previewDialog = new Morebits.simpleWindow(750, 400);
		previewDialog.setTitle("Welcome template preview");
		previewDialog.setScriptName("Welcome user");
		previewDialog.setModality(true);

		var previewdiv = document.createElement("div");
		previewdiv.style.marginLeft = previewdiv.style.marginRight = "0.5em";
		previewdiv.style.fontSize = "small";
		previewDialog.setContent(previewdiv);

		var previewer = new Morebits.wiki.preview(previewdiv);
		previewer.beginRender(Twinkle.welcome.getTemplateWikitext(form.getChecked("template"), form.article.value));

		var submit = document.createElement("input");
		submit.setAttribute("type", "submit");
		submit.setAttribute("value", "Close");
		previewDialog.addContent(submit);

		previewDialog.display();

		$(submit).click(function(e) {
			previewDialog.close();
		});
	},
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters();
		var text = pageobj.getPageText();

		// abort if mode is auto and form is not empty
		if( pageobj.exists() && params.mode === 'auto' ) {
			Morebits.status.info( 'Warning', 'User talk page not empty; aborting automatic welcome' );
			Morebits.wiki.actionCompleted.event();
			return;
		}

		var welcomeText = Twinkle.welcome.getTemplateWikitext(params.value, params.article);

		if( Twinkle.getFriendlyPref('topWelcomes') ) {
			text = welcomeText + '\n\n' + text;
		} else {
			text += "\n" + welcomeText;
		}

		var summaryText = "Welcome to Wikipedia!";
		pageobj.setPageText(text);
		pageobj.setEditSummary(summaryText + Twinkle.getPref('summaryAd'));
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchWelcomes'));
		pageobj.setCreateOption('recreate');
		pageobj.save();
	}
};

Twinkle.welcome.callback.evaluate = function friendlywelcomeCallbackEvaluate(e) {
	var form = e.target;

	var params = {
		value: form.getChecked("template"),
		article: form.article.value,
		mode: 'manual'
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "Welcoming complete, reloading talk page in a few seconds";

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "User talk page modification");
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.welcome.callbacks.main);
};
