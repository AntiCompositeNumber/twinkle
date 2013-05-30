//<nowiki>


(function($){


/*
 ****************************************
 *** twinklewarn.js: Warn module
 ****************************************
 * Mode of invocation:     Tab ("Warn")
 * Active on:              User talk pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.warn = function twinklewarn() {
	if( mw.config.get('wgNamespaceNumber') === 3 ) {
			Twinkle.addPortletLink( Twinkle.warn.callback, "Warn", "tw-warn", "Warn/notify user" );
	}

	// modify URL of talk page on rollback success pages
	if( mw.config.get('wgAction') === 'rollback' ) {
		var $vandalTalkLink = $("#mw-rollback-success").find(".mw-usertoollinks a").first();
		$vandalTalkLink.css("font-weight", "bold");
		$vandalTalkLink.wrapInner($("<span/>").attr("title", "If appropriate, you can use Twinkle to warn the user about their edits to this page."));

		var extraParam = "vanarticle=" + mw.util.rawurlencode(mw.config.get("wgPageName").replace(/_/g, " "));
		var href = $vandalTalkLink.attr("href");
		if (href.indexOf("?") === -1) {
			$vandalTalkLink.attr("href", href + "?" + extraParam);
		} else {
			$vandalTalkLink.attr("href", href + "&" + extraParam);
		}
	}
};

Twinkle.warn.callback = function twinklewarnCallback() {
	if ( !Twinkle.userAuthorized ) {
		alert("Your account is too new to use Twinkle.");
		return;
	}
	if( mw.config.get('wgTitle').split( '/' )[0] === mw.config.get('wgUserName') &&
			!confirm( 'Warning yourself can be seen as a sign of mental instability! Are you sure you want to proceed?' ) ) {
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 440 );
	Window.setTitle( "Warn/notify user" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "User talk page warnings", "Template:User_talk_page_warnings#Warnings_and_notices" );
	Window.addFooterLink( "Twinkle help", "WP:TW/DOC#warn" );

	var form = new Morebits.quickForm( Twinkle.warn.callback.evaluate );
	var main_select = form.append( {
			type:'field',
			label:'Choose type of warning/notice to issue',
			tooltip:'First choose a main warning group, then the specific warning to issue.'
		} );

	var main_group = main_select.append( {
			type:'select',
			name:'main_group',
			event:Twinkle.warn.callback.change_category
		} );

	var defaultGroup = parseInt(Twinkle.getPref('defaultWarningGroup'), 10);
	main_group.append( { type:'option', label:'General note (1)', value:'level1', selected: ( defaultGroup === 1 || defaultGroup < 1 || ( Morebits.userIsInGroup( 'sysop' ) ? defaultGroup > 8 : defaultGroup > 7 ) ) } );
	main_group.append( { type:'option', label:'Caution (2)', value:'level2', selected: ( defaultGroup === 2 ) } );
	main_group.append( { type:'option', label:'Warning (3)', value:'level3', selected: ( defaultGroup === 3 ) } );
	main_group.append( { type:'option', label:'Final warning (4)', value:'level4', selected: ( defaultGroup === 4 ) } );
	main_group.append( { type:'option', label:'Only warning (4im)', value:'level4im', selected: ( defaultGroup === 5 ) } );
	main_group.append( { type:'option', label:'Single issue notices', value:'singlenotice', selected: ( defaultGroup === 6 ) } );
	main_group.append( { type:'option', label:'Single issue warnings', value:'singlewarn', selected: ( defaultGroup === 7 ) } );
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		main_group.append( { type:'option', label:'Blocking', value:'block', selected: ( defaultGroup === 8 ) } );
	}

	main_select.append( { type:'select', name:'sub_group', event:Twinkle.warn.callback.change_subcategory } ); //Will be empty to begin with.

	form.append( {
			type:'input',
			name:'article',
			label:'Linked article',
			value:( Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '' ),
			tooltip:'An article can be linked within the notice, perhaps because it was a revert to said article that dispatched this notice. Leave empty for no article to be linked.'
		} );

	var more = form.append( { type: 'field', name: 'reasonGroup', label: 'Warning information' } );
	more.append( { type:'textarea', label:'Optional message:', name:'reason', tooltip:'Perhaps a reason, or that a more detailed notice must be appended' } );

	var previewlink = document.createElement( 'a' );
	$(previewlink).click(function(){
		Twinkle.warn.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = "pointer";
	previewlink.textContent = 'Preview';
	more.append( { type: 'div', id: 'warningpreview', label: [ previewlink ] } );
	more.append( { type: 'div', id: 'twinklewarn-previewbox', style: 'display: none' } );

	more.append( { type:'submit', label:'Submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();
	result.main_group.root = result;
	result.previewer = new Morebits.wiki.preview($(result).find('div#twinklewarn-previewbox').last()[0]);

	// We must init the first choice (General Note);
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.main_group.dispatchEvent( evt );
};

// This is all the messages that might be dispatched by the code
// Each of the individual templates require the following information:
//   label (required): A short description displayed in the dialog
//   summary (required): The edit summary used. If an article name is entered, the summary is postfixed with "on [[article]]", and it is always postfixed with ". $summaryAd"
//   suppressArticleInSummary (optional): Set to true to suppress showing the article name in the edit summary. Useful if the warning relates to attack pages, or some such.
Twinkle.warn.messages = {
	level1: {
		"uw-vandalism1": {
			label:"Vandalism",
			summary:"General note: Unhelpful changes"
		},
		"uw-test1": {
			label:"Editing tests",
			summary:"General note: Editing tests"
		},
		"uw-delete1": {
			label:"Removal of content, blanking",
			summary:"General note: Removal of content, blanking"
		},
		"uw-create1": {
			label:"Creating inappropriate pages",
			summary:"General note: Creating inappropriate pages"
		},
		"uw-advert1": {
			label:"Using Wikipedia for advertising or promotion",
			summary:"General note: Using Wikipedia for advertising or promotion"
		},
		"uw-copyright1": {
			label:"Copyright violation",
			summary:"General note: Violating copyright"
		},
		"uw-error1": {
			label:"Deliberately adding wrong information",
			summary:"General note: Adding wrong information"
		},
		"uw-biog1": {
			label:"Adding unreferenced controversial information about living persons",
			summary:"General note: Adding unreferenced controversial information about living persons"
		},
		"uw-mos1": {
			label:"Manual of style",
			summary:"General note: Formatting, date, language, etc (Manual of style)"
		},
		"uw-move1": {
			label:"Page moves against naming conventions or consensus",
			summary:"General note: Page moves against naming conventions or consensus"
		},
		"uw-npov1": {
			label:"Not adhering to neutral point of view",
			summary:"General note: Not adhering to neutral point of view"
		},
		"uw-tpv1": {
			label:"Changing others' talk page comments",
			summary:"General note: Changing others' talk page comments"
		},
		"uw-qd": {
			label:"Removing quick-deletion templates",
			summary:"General note: Removing quick-deletion templates"
		},
		"uw-npa1": {
			label:"Personal attack directed at another editor",
			summary:"General note: Personal attack directed at another editor"
		},
		"uw-agf1": {
			label:"Not assuming good faith",
			summary:"General note: Not assuming good faith"
		},
		"uw-unsourced1": {
			label:"Addition of unsourced or improperly cited material",
			summary:"General note: Addition of unsourced or improperly cited material"
		}
	},
	level2: {
		"uw-vandalism2": {
			label:"Vandalism",
			summary:"Caution: Vandalism"
		},
		"uw-test2": {
			label:"Editing tests",
			summary:"Caution: Editing tests"
		},
		"uw-delete2": {
			label:"Removal of content, blanking",
			summary:"Caution: Removal of content, blanking"
		},
		"uw-create2": {
			label:"Creating inappropriate pages",
			summary:"Caution: Creating inappropriate pages"
		},
		"uw-advert2": {
			label:"Using Wikipedia for advertising or promotion",
			summary:"Caution: Using Wikipedia for advertising or promotion"
		},
		"uw-copyright2": {
			label:"Copyright violation",
			summary:"Caution: Violating copyright"
		},
		"uw-npov2": {
			label:"Not adhering to neutral point of view",
			summary:"Caution: Not adhering to neutral point of view"
		},
		"uw-error2": {
			label:"Deliberately adding wrong information",
			summary:"Caution: Adding wrong information"
		},
		"uw-biog2": {
			label:"Adding unreferenced controversial information about living persons",
			summary:"Caution: Adding unreferenced controversial information about living persons"
		},
		"uw-mos2": {
			label:"Manual of style",
			summary:"Caution: Formatting, date, language, etc (Manual of style)"
		},
		"uw-move2": {
			label:"Page moves against naming conventions or consensus",
			summary:"Caution: Page moves against naming conventions or consensus"
		},
		"uw-tpv2": {
			label:"Changing others' talk page comments",
			summary:"Caution: Changing others' talk page comments"
		},
		"uw-npa2": {
			label:"Personal attack directed at another editor",
			summary:"Caution: Personal attack directed at another editor"
		},
		"uw-agf2": {
			label:"Not assuming good faith",
			summary:"Caution: Not assuming good faith"
		},
		"uw-unsourced2": {
			label:"Addition of unsourced or improperly cited material",
			summary:"Caution: Addition of unsourced or improperly cited material"
		}
	},
	level3: {
		"uw-vandalism3": {
			label:"Vandalism",
			summary:"Warning: Vandalism"
		},
		"uw-test3": {
			label:"Editing tests",
			summary:"Warning: Editing tests"
		},
		"uw-delete3": {
			label:"Removal of content, blanking",
			summary:"Warning: Removal of content, blanking"
		},
		"uw-create3": {
			label:"Creating inappropriate pages",
			summary:"Warning: Creating inappropriate pages"
		},
		"uw-advert3": {
			label:"Using Wikipedia for advertising or promotion",
			summary:"Warning: Using Wikipedia for advertising or promotion"
		},
		"uw-npov3": {
			label:"Not adhering to neutral point of view",
			summary:"Warning: Not adhering to neutral point of view"
		},
		"uw-error3": {
			label:"Deliberately adding wrong information",
			summary:"Warning: Adding wrong information"
		},
		"uw-biog3": {
			label:"Adding unreferenced controversial or defamatory information about living persons",
			summary:"Warning: Adding unreferenced controversial information about living persons"
		},
		"uw-mos3": {
			label:"Manual of style",
			summary:"Warning: Formatting, date, language, etc (Manual of style)"
		},
		"uw-move3": {
			label:"Page moves against naming conventions or consensus",
			summary:"Warning: Page moves against naming conventions or consensus"
		},
		"uw-tpv3": {
			label:"Changing others' talk page comments",
			summary:"Warning: Changing others' talk page comments"
		},
		"uw-npa3": {
			label:"Personal attack directed at another editor",
			summary:"Warning: Personal attack directed at another editor"
		},
		"uw-agf3": {
			label:"Not assuming good faith",
			summary:"Warning: Not assuming good faith"
		}

	},
	level4: {
		"uw-generic4": {
			label:"Generic warning (for template series missing level 4)",
			summary:"Final warning notice"
		},
		"uw-vandalism4": {
			label:"Vandalism",
			summary:"Final warning: Vandalism"
		},
		"uw-test4": {
			label:"Editing tests",
			summary:"Final warning: Editing tests"
		},
		"uw-delete4": {
			label:"Removal of content, blanking",
			summary:"Final warning: Removal of content, blanking"
		},
		"uw-create4": {
			label:"Creating inappropriate pages",
			summary:"Final warning: Creating inappropriate pages"
		},
		"uw-advert4": {
			label:"Using Wikipedia for advertising or promotion",
			summary:"Final warning: Using Wikipedia for advertising or promotion"
		},
		"uw-npov4": {
			label:"Not adhering to neutral point of view",
			summary:"Final warning: Not adhering to neutral point of view"
		},
		"uw-error4": {
			label:"Deliberately adding wrong information",
			summary:"Final Warning: Adding wrong information"
		},
		"uw-biog4": {
			label:"Adding unreferenced defamatory information about living persons",
			summary:"Final warning: Adding unreferenced controversial information about living persons"
		},
		"uw-mos4": {
			label:"Manual of style",
			summary:"Final warning: Formatting, date, language, etc (Manual of style)"
		},
		"uw-move4": {
			label:"Page moves against naming conventions or consensus",
			summary:"Final warning: Page moves against naming conventions or consensus"
		},
		"uw-npa4": {
			label:"Personal attack directed at another editor",
			summary:"Final warning: Personal attack directed at another editor"
		}

	},
	level4im: {
		"uw-vandalism4im": {
			label:"Vandalism",
			summary:"Only warning: Vandalism"
		},
		"uw-delete4im": {
			label:"Removal of content, blanking",
			summary:"Only warning: Removal of content, blanking"
		},
		"uw-create4im": {
			label:"Creating inappropriate pages",
			summary:"Only warning: Creating inappropriate pages"
		},
		"uw-biog4im": {
			label:"Adding unreferenced defamatory information about living persons",
			summary:"Only warning: Adding unreferenced controversial information about living persons"
		},
		"uw-move4im": {
			label:"Page moves against naming conventions or consensus",
			summary:"Only warning: Page moves against naming conventions or consensus"
		},
		"uw-npa4im": {
			label:"Personal attack directed at another editor",
			summary:"Only warning: Personal attack directed at another editor"
		}
	},
	singlenotice: {
		"uw-badcat": {
			label:"Adding incorrect categories",
			summary:"Notice: Adding incorrect categories"
		},
		"uw-bite": {
			label:"\"Biting\" newcomers",
			summary:"Notice: \"Biting\" newcomers"
		},
		"uw-coi": {
			label:"Possible conflict of interest",
			summary:"Notice: Possible conflict of interest"
		},
		"uw-encopypaste": {
			label:"Direct copying of article from English Wikipedia",
			summary:"Notice: Direct copying of article from English Wikipedia"
		},
		"uw-encopyright": {
			label:"Not giving attribution for content from another Wikipedia",
			summary:"Notice: Reusing content from English Wikipedia without attribution"
		},
		"uw-emptycat": {
			label:"Category created does not contain enough pages",
			summary:"Notice: Creating empty categories"
		},
		"uw-joke": {
			label:"Using improper humor",
			summary:"Notice: Using improper humor"
		},
		"uw-lang": {
			label:"Changing between types of English without a good reason",
			summary:"Notice: Unnecessarily changing between British and American English"
		},
		"uw-newarticle": {
			label:"Tips on creating new articles",
			summary:"Notice: How to make your articles better"
		},
		"uw-notenglish": {
			label:"Changes not in English",
			summary:"Notice: Please edit in English"
		},
		"uw-otherweb": {
			label:"Use \"Other websites\", not \"External links\"",
			summary:"Notice: Use \"Other websites\", not \"External links\""
		},
		"uw-sandbox": {
			label:"Removing the sandbox header",
			summary:"Notice: Do not remove sandbox header"
		},
		"uw-selfrevert": {
			label:"Undoing recent test",
			summary:"Notice: Undoing recent test"
		},
		"uw-simple": {
			label:"Not making changes in simple English",
			summary:"Notice: Not making changes in simple English"
		},
		"uw-spellcheck": {
			label:"Review spelling, etc.",
			summary:"Notice: Review spelling, etc."
		},
		"uw-subst": {
			label:"Remember to subst: templates",
			summary:"Notice: Remember to subst: templates"
		},
		"uw-tilde": {
			label:"Not signing posts",
			summary:"Notice: Not signing posts"
		},
		"uw-upload": {
			label:"Image uploads not allowed in Simple English Wikipedia",
			summary:"Notice: Image uploads not allowed in Simple English Wikipedia"
		},
		"uw-warn": {
			label:"Use user warn templates",
			summary:"Notice: Use user warn templates"
		}
	},
	singlewarn: {
		"uw-3rr": {
			label:"Edit warring",
			summary:"Warning: Involved in edit war"
		},
		"uw-attack": {
			label:"Creating attack pages",
			summary:"Warning: Creating attack pages"
		},
		"uw-cyberbully": {
			label:"Cyberbullying",
			summary:"Warning: Cyberbullying"
		},
        "uw-disruption": {
			label:"Project disruption",
			summary:"Warning: Project disruption"
		},
        "uw-longterm": {
			label:"Long term abuse",
			summary:"Warning: Long term abuse"
		},
		"uw-qd": {
			label:"Removing quick deletion templates from articles",
			summary:"Warning: Removing quick deletion templates from articles"
		},
		"uw-spam": {
			label:"Adding spam links",
			summary:"Warning: Adding spam links"
		},
		"uw-userpage": {
			label:"Userpage or subpage is against policy",
			summary:"Warning: Userpage or subpage is against policy"
		}
	},
	block: {
		"uw-block1": {
			label: "Block level 1",
			summary: "You have been temporarily blocked",
			reasonParam: true
		},
		"uw-block2": {
			label: "Block level 2",
			summary: "You have been blocked",
			reasonParam: true
		},
		"uw-block3": {
			label: "Block level 3",
			summary: "You have been indefinitely blocked",
			reasonParam: true
		},
		"UsernameBlocked": {
			label: "Username block",
			summary: "You have been blocked for violation of the [[Wikipedia:Username|username policy]]",
			reasonParam: true
		},
		"UsernameHardBlocked": {
			label: "Username hard block",
			summary: "You have been blocked for a blatant violation of the [[Wikipedia:Username|username policy]]",
			reasonParam: true
		},
        "Blocked proxy": {
			label: "Blocked proxy",
			summary: "You have been blocked because this IP is an [[open proxy]]"
		},
        "Uw-spamblock": {
			label: "Spam block",
			summary: "You have been blocked for [[Wikipedia:Spam|advertising or promotion]]"
		},
        "Cyberbully block": {
			label: "Cyberbully block",
			summary: "You have been blocked for [[Wikipedia:Cyberbullying|cyberbullying]]"
		},
        "Talkpage-revoked": {
			label: "Talk-page access removed",
			summary: "Your ability to change this [[Wikipedia:Talk page|talk page]] has been removed"
		}
	}
};

Twinkle.warn.prev_block_timer = null;
Twinkle.warn.prev_block_reason = null;
Twinkle.warn.prev_article = null;
Twinkle.warn.prev_reason = null;

Twinkle.warn.callback.change_category = function twinklewarnCallbackChangeCategory(e) {
	var value = e.target.value;
	var sub_group = e.target.root.sub_group;
	var messages = Twinkle.warn.messages[ value ];
	sub_group.main_group = value;
	var old_subvalue = sub_group.value;
	var old_subvalue_re;
	if( old_subvalue ) {
		old_subvalue = old_subvalue.replace(/\d*(im)?$/, '' );
		old_subvalue_re = new RegExp( RegExp.escape( old_subvalue ) + "(\\d*(?:im)?)$" );
	}

	while( sub_group.hasChildNodes() ){
		sub_group.removeChild( sub_group.firstChild );
	}

	for( var i in messages ) {
		var selected = false;
		if( old_subvalue && old_subvalue_re.test( i ) ) {
			selected = true;
		}
		var elem = new Morebits.quickForm.element( { type:'option', label:"{{" + i + "}}: " + messages[i].label, value:i, selected: selected } );

		sub_group.appendChild( elem.render() );
	}

	if( value === 'block' ) {
		// create the block-related fields
		var more = new Morebits.quickForm.element( { type: 'div', id: 'block_fields' } );
		more.append( {
			type: 'input',
			name: 'block_timer',
			label: 'Period of blocking / Host ',
			tooltip: 'The period the blocking is due for, for example 24 hours, 2 weeks, indefinite etc... If you selected "blocked proxy", this text box will append the host name of the server'
		} );
		more.append( {
			type: 'input',
			name: 'block_reason',
			label: '"You have been blocked for ..." ',
			tooltip: 'An optional reason, to replace the default generic reason. Only available for the generic block templates.'
		} );

		e.target.root.insertBefore( more.render(), e.target.root.lastChild );

		// restore saved values of fields
		if(Twinkle.warn.prev_block_timer !== null) {
			e.target.root.block_timer.value = Twinkle.warn.prev_block_timer;
			Twinkle.warn.prev_block_timer = null;
		}
		if(Twinkle.warn.prev_block_reason !== null) {
			e.target.root.block_reason.value = Twinkle.warn.prev_block_reason;
			Twinkle.warn.prev_block_reason = null;
		}
		if(Twinkle.warn.prev_article === null) {
			Twinkle.warn.prev_article = e.target.root.article.value;
		}
		e.target.root.article.disabled = false;

		$(e.target.root.reason).parent().hide();
		e.target.root.previewer.closePreview();
	} else if( e.target.root.block_timer ) {
		// hide the block-related fields
		if(!e.target.root.block_timer.disabled && Twinkle.warn.prev_block_timer === null) {
			Twinkle.warn.prev_block_timer = e.target.root.block_timer.value;
		}
		if(!e.target.root.block_reason.disabled && Twinkle.warn.prev_block_reason === null) {
			Twinkle.warn.prev_block_reason = e.target.root.block_reason.value;
		}
		$(e.target.root).find("#block_fields").remove();

		if(e.target.root.article.disabled && Twinkle.warn.prev_article !== null) {
			e.target.root.article.value = Twinkle.warn.prev_article;
			Twinkle.warn.prev_article = null;
		}
		e.target.root.article.disabled = false;

		$(e.target.root.reason).parent().show();
		e.target.root.previewer.closePreview();
	}

	// clear overridden label on article textbox
	Morebits.quickForm.setElementTooltipVisibility(e.target.root.article, true);
	Morebits.quickForm.resetElementLabel(e.target.root.article);
};

Twinkle.warn.callback.change_subcategory = function twinklewarnCallbackChangeSubcategory(e) {
	var main_group = e.target.form.main_group.value;
	var value = e.target.form.sub_group.value;

	if( main_group === 'singlewarn' ) {
		if( value === 'uw-username' ) {
			if(Twinkle.warn.prev_article === null) {
				Twinkle.warn.prev_article = e.target.form.article.value;
			}
			e.target.form.article.notArticle = true;
			e.target.form.article.value = '';
		} else if( e.target.form.article.notArticle ) {
			if(Twinkle.warn.prev_article !== null) {
				e.target.form.article.value = Twinkle.warn.prev_article;
				Twinkle.warn.prev_article = null;
			}
			e.target.form.article.notArticle = false;
		}
	} else if( main_group === 'block' ) {
		if( Twinkle.warn.messages.block[value].indefinite ) {
			if(Twinkle.warn.prev_block_timer === null) {
				Twinkle.warn.prev_block_timer = e.target.form.block_timer.value;
			}
			e.target.form.block_timer.disabled = true;
			e.target.form.block_timer.value = 'indefinite';
		} else if( e.target.form.block_timer.disabled ) {
			if(Twinkle.warn.prev_block_timer !== null) {
				e.target.form.block_timer.value = Twinkle.warn.prev_block_timer;
				Twinkle.warn.prev_block_timer = null;
			}
			e.target.form.block_timer.disabled = false;
		}

		if( Twinkle.warn.messages.block[value].pageParam ) {
			if(Twinkle.warn.prev_article !== null) {
				e.target.form.article.value = Twinkle.warn.prev_article;
				Twinkle.warn.prev_article = null;
			}
			e.target.form.article.disabled = false;
		} else if( !e.target.form.article.disabled ) {
			if(Twinkle.warn.prev_article === null) {
				Twinkle.warn.prev_article = e.target.form.article.value;
			}
			e.target.form.article.disabled = true;
			e.target.form.article.value = '';
		}

		if( Twinkle.warn.messages.block[value].reasonParam ) {
			if(Twinkle.warn.prev_block_reason !== null) {
				e.target.form.block_reason.value = Twinkle.warn.prev_block_reason;
				Twinkle.warn.prev_block_reason = null;
			}
			e.target.form.block_reason.disabled = false;
		} else if( !e.target.form.block_reason.disabled ) {
			if(Twinkle.warn.prev_block_reason === null) {
				Twinkle.warn.prev_block_reason = e.target.form.block_reason.value;
			}
			e.target.form.block_reason.disabled = true;
			e.target.form.block_reason.value = '';
		}
	}

	// change form labels according to the warning selected
	if (value === "uw-username") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, "Username violates policy because... ");
	} else {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, true);
		Morebits.quickForm.resetElementLabel(e.target.form.article);
	}
};

Twinkle.warn.callbacks = {
	preview: function(form) {
		var templatename = form.sub_group.value;

		var templatetext = '{{subst:' + templatename;
		var linkedarticle = form.article.value;
		if (templatename in Twinkle.warn.messages.block) {
			if( linkedarticle && Twinkle.warn.messages.block[templatename].pageParam ) {
				templatetext += '|page=' + linkedarticle;
			}

			var blocktime = form.block_timer.value;
			if( /te?mp|^\s*$|min/.exec( blocktime ) || Twinkle.warn.messages.block[templatename].indefinite ) {
				; // nothing
			} else if( /indef|\*|max/.exec( blocktime ) ) {
				templatetext += '|indef=yes';
			} else {
					templatetext += '|host=' + blocktime;
					templatetext += '|time=' + blocktime;
			}

			var blockreason = form.block_reason.value;
			if( blockreason ) {
				templatetext += '|reason=' + blockreason;
			}

			templatetext += "|sig=true}}";
		} else {
			if (linkedarticle) {
				// add linked article for user warnings (non-block templates)
				templatetext += '|1=' + linkedarticle;
			}
			templatetext += '}}';

			// add extra message for non-block templates
			var reason = form.reason.value;
			if (reason) {
				templatetext += " ''" + reason + "''";
			}
		}

		form.previewer.beginRender(templatetext);
	},
	main: function( pageobj ) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();
		var messageData = Twinkle.warn.messages[params.main_group][params.sub_group];

		var history_re = /<!-- Template:(uw-.*?) -->.*?(\d{1,2}:\d{1,2}, \d{1,2} \w+ \d{4}) \(UTC\)/g;
		var history = {};
		var latest = { date:new Date( 0 ), type:'' };
		var current;

		while( ( current = history_re.exec( text ) ) ) {
			var current_date = new Date( current[2] + ' UTC' );
			if( !( current[1] in history ) ||  history[ current[1] ] < current_date ) {
				history[ current[1] ] = current_date;
			}
			if( current_date > latest.date ) {
				latest.date = current_date;
				latest.type = current[1];
			}
		}

		var date = new Date();

		if( params.sub_group in history ) {
			var temp_time = new Date( history[ params.sub_group ] );
			temp_time.setUTCHours( temp_time.getUTCHours() + 24 );

			if( temp_time > date ) {
				if( !confirm( "An identical " + params.sub_group + " has been issued in the last 24 hours.  \nWould you still like to add this warning/notice?" ) ) {
					pageobj.statelem.info( 'aborted per user request' );
					return;
				}
			}
		}

		latest.date.setUTCMinutes( latest.date.getUTCMinutes() + 1 ); // after long debate, one minute is max

		if( latest.date > date ) {
			if( !confirm( "A " + latest.type + " has been issued in the last minute.  \nWould you still like to add this warning/notice?" ) ) {
				pageobj.statelem.info( 'aborted per user request' );
				return;
			}
		}

		var mainheaderRe = new RegExp("==+\\s*Warnings\\s*==+");
		var headerRe = new RegExp( "^==+\\s*(?:" + date.getUTCMonthName() + '|' + date.getUTCMonthNameAbbrev() +  ")\\s+" + date.getUTCFullYear() + "\\s*==+", 'm' );

		if( text.length > 0 ) {
			text += "\n\n";
		}

		if( params.main_group === 'block' ) {
			var article = '', reason = '', host = '', time = null;

			if( Twinkle.getPref('blankTalkpageOnIndefBlock') && params.sub_group !== 'uw-lblock' && ( Twinkle.warn.messages.block[params.sub_group].indefinite || (/indef|\*|max/).exec( params.block_timer ) ) ) {
				Morebits.status.info( 'Info', 'Blanking talk page per preferences and creating a new level 2 heading for the date' );
				text = "== " + date.getUTCMonthName() + " " + date.getUTCFullYear() + " ==\n";
			} else if( !headerRe.exec( text ) ) {
				Morebits.status.info( 'Info', 'Will create a new level 2 heading for the date, as none was found for this month' );
				text += "== " + date.getUTCMonthName() + " " + date.getUTCFullYear() + " ==\n";
			}

			if( params.reason && Twinkle.warn.messages.block[params.sub_group].reasonParam ) {
				reason = '|reason=' + params.reason;
			}

			if( /te?mp|^\s*$|min/.exec( params.block_timer ) || Twinkle.warn.messages.block[params.sub_group].indefinite ) {
				time = '';
			} else if( /indef|\*|max/.exec( params.block_timer ) ) {
				time = '|indef=yes';
			} else {
				time = '|time=' + params.block_timer;
			}

			if ( params.sub_group === "Blocked proxy" )
			{
				text += "{{" + params.sub_group + "|host=" + params.block_timer + "}}";

			} else {
				text += "{{subst:" + params.sub_group + time + reason + "|sig=yes}}";
			}
		} else {
			if( !headerRe.exec( text ) ) {
				Morebits.status.info( 'Info', 'Will create a new level 2 heading for the date, as none was found for this month' );
				text += "== " + date.getUTCMonthName() + " " + date.getUTCFullYear() + " ==\n";
			}
			text += "{{subst:" + params.sub_group + ( params.article ? '|1=' + params.article : '' ) + "|subst=subst:}}" + (params.reason ? " ''" + params.reason + "'' ": ' ' ) + "~~~~";
		}

		if ( Twinkle.getPref('showSharedIPNotice') && Morebits.isIPAddress( mw.config.get('wgTitle') ) ) {
			Morebits.status.info( 'Info', 'Adding a shared IP notice' );
			text +=  "\n{{subst:SharedIPAdvice}}";
		}

		var summary = messageData.summary;
		if ( messageData.suppressArticleInSummary !== true && params.article ) {
			summary += " on [[" + params.article + "]]";
		}
		summary += "." + Twinkle.getPref("summaryAd");

		pageobj.setPageText( text );
		pageobj.setEditSummary( summary );
		pageobj.setWatchlist( Twinkle.getPref('watchWarnings') );
		pageobj.save();
	}
};

Twinkle.warn.callback.evaluate = function twinklewarnCallbackEvaluate(e) {

	// First, check to make sure a reason was filled in if uw-username was selected

	if(e.target.sub_group.value === 'uw-username' && e.target.article.value.trim() === '') {
		alert("You must supply a reason for the {{uw-username}} template.");
		return;
	}

	// Then, grab all the values provided by the form

	var params = {
		reason: e.target.block_reason ? e.target.block_reason.value : e.target.reason.value,
		main_group: e.target.main_group.value,
		sub_group: e.target.sub_group.value,
		article: e.target.article.value,  // .replace( /^(Image|Category):/i, ':$1:' ),  -- apparently no longer needed...
		block_timer: e.target.block_timer ? e.target.block_timer.value : null
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "Warning complete, reloading talk page in a few seconds";

	var wikipedia_page = new Morebits.wiki.page( mw.config.get('wgPageName'), 'User talk page modification' );
	wikipedia_page.setCallbackParameters( params );
	wikipedia_page.setFollowRedirect( true );
	wikipedia_page.load( Twinkle.warn.callbacks.main );
};
})(jQuery);


//</nowiki>
