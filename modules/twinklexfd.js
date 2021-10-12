/*
 ****************************************
 *** twinklexfd.js: XFD module
 ****************************************
 * Mode of invocation:     Tab ("XFD")
 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
 * Config directives in:   TwinkleConfig
 */

Twinkle.xfd = function twinklexfd() {
	// Disable on:
	// * special pages
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2)
	// * file pages without actual files (these are eligible for CSD G8)
	if ( mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Morebits.wiki.isPageRedirect()))) ) {
		return;
	}
	twAddPortletLink( Twinkle.xfd.callback, "RfD", "tw-xfd", "Nominate for deletion" );
};

Twinkle.xfd.num2order = function twinklexfdNum2order( num ) {
	switch( num ) {
	case 1: return '';
	case 2: return '2nd';
	case 3: return '3rd';
	default: return num + 'th';
	}
};

Twinkle.xfd.currentRationale = null;

// error callback on Morebits.status.object
Twinkle.xfd.printRationale = function twinklexfdPrintRationale() {
	if (Twinkle.xfd.currentRationale) {
		var p = document.createElement("p");
		p.textContent = "Your deletion rationale is provided below, which you can copy and paste into a new XFD dialog if you wish to try again:";
		var pre = document.createElement("pre");
		pre.className = "toccolours";
		pre.style.marginTop = "0";
		pre.textContent = Twinkle.xfd.currentRationale;
		p.appendChild(pre);
		Morebits.status.root.appendChild(p);
		// only need to print the rationale once
		Twinkle.xfd.currentRationale = null;
	}
};

Twinkle.xfd.callback = function twinklexfdCallback() {
	if (!twinkleUserAuthorized) {
		alert("Your account is too new to use Twinkle.");
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 350 );
	Window.setTitle( "Nominate for deletion (RfD)" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Deletion policy", "Wikipedia:Deletion policy" );
	Window.addFooterLink( "About deletion discussions", "WP:RfD" );
	Window.addFooterLink( "Twinkle help", "WP:TW/DOC#xfd" );

	var form = new Morebits.quickForm( Twinkle.xfd.callback.evaluate );
	var categories = form.append( {
			type: 'select',
			name: 'category',
			label: 'Select wanted type of category: ',
			tooltip: 'This default should be the most appropriate, as no other deletion discussion pages exist here.',
			event: Twinkle.xfd.callback.change_category
		} );
	categories.append( {
			type: 'option',
			label: 'RfD (Requests for deletion)',
			selected: true,
			value: 'afd'
		} );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: 'Notify page creator if possible',
					value: 'notify',
					name: 'notify',
					tooltip: "A notification template will be placed on the creator's talk page if this is true.",
					checked: true
				}
			]
		}
	);
	form.append( {
			type: 'field',
			label:'Work area',
			name: 'work_area'
		} );
	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the controls
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.category.dispatchEvent( evt );
};

Twinkle.xfd.previousNotify = true;

Twinkle.xfd.callback.change_category = function twinklexfdCallbackChangeCategory(e) {
	var value = e.target.value;
	var form = e.target.form;
	var old_area = Morebits.quickForm.getElements(e.target.form, "work_area")[0];
	var work_area = null;

	var oldreasontextbox = form.getElementsByTagName('textarea')[0];
	var oldreason = (oldreasontextbox ? oldreasontextbox.value : '');

		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: 'Requests for deletion',
				name: 'work_area'
			} );
		work_area.append( {
				type: 'checkbox',
				list: [
						{
							label: 'Wrap deletion tag with <noinclude>',
							value: 'noinclude',
							name: 'noinclude',
							tooltip: 'Will wrap the deletion tag in &lt;noinclude&gt; tags, so that it won\'t transclude. This option is not normally required.'
						}
					]
		} );

		work_area.append( {
				type: 'textarea',
				name: 'xfdreason',
				label: 'Reason: '
			} );
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
	}

Twinkle.xfd.callbacks = {
	afd: {
		main: function(apiobj) {
			var xmlDoc = apiobj.responseXML;
			var titles = $(xmlDoc).find('allpages p');

			// There has been no earlier entries with this prefix, just go on.
			if( titles.length <= 0 ) {
				apiobj.params.numbering = apiobj.params.number = '';
			} else {
				var number = 0;
				for( var i = 0; i < titles.length; ++i ) {
					var title = titles[i].getAttribute('title');

					// First, simple test, is there an instance with this exact name?
					if( title === 'Wikipedia:Requests for deletion/Requests/' + ((new Date()).getUTCFullYear()) + '/' + mw.config.get('wgPageName') ) {
						number = Math.max( number, 1 );
						continue;
					}

					var order_re = new RegExp( '^' +
						RegExp.escape( 'Wikipedia:Requests for deletion/Requests/' + ((new Date()).getUTCFullYear()) + '/' + mw.config.get('wgPageName'), true ) +
						'\\s*\\(\\s*(\\d+)(?:(?:th|nd|rd|st) nom(?:ination)?)?\\s*\\)\\s*$');
					var match = order_re.exec( title );

					// No match; A non-good value
					if( !match ) {
						continue;
					}

					// A match, set number to the max of current
					number = Math.max( number, Number(match[1]) );
				}
				apiobj.params.number = Twinkle.xfd.num2order( parseInt( number, 10 ) + 1);
				apiobj.params.numbering = number > 0 ? ' (' + apiobj.params.number + ' nomination)' : '';
			}
			apiobj.params.discussionpage = 'Wikipedia:Requests for deletion/Requests/' + ((new Date()).getUTCFullYear()) + '/' + mw.config.get('wgPageName') + apiobj.params.numbering;

			Morebits.status.info( "Next discussion page", "[[" + apiobj.params.discussionpage + "]]" );

			// Updating data for the action completed event
			Morebits.wiki.actionCompleted.redirect = apiobj.params.discussionpage;
			Morebits.wiki.actionCompleted.notice = "Nomination completed, now redirecting to the discussion page";

			// Tagging article
			var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "Adding deletion tag to article");
			if(window.location.search.includes("redirect=no")) {
				wikipedia_page.setFollowRedirect(false); // User's intention was probably to tag the redirect itself
			} else {
				wikipedia_page.setFollowRedirect(true);  // should never be needed, but if the article is moved, we would want to follow the redirect
			}
			wikipedia_page.setCallbackParameters(apiobj.params);
			wikipedia_page.load(Twinkle.xfd.callbacks.afd.taggingArticle);
		},
		// Tagging needs to happen before everything else: this means we can check if there is an AfD tag already on the page
		taggingArticle: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();
			var statelem = pageobj.getStatusElement();

			// Check for existing AfD tag, for the benefit of new page patrollers
			var textNoAfd = text.replace(/\{\{\s*(Requests for deletion\/dated|RfDM)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, "");
			if (text !== textNoAfd) {
				if (confirm("An RfD tag was found on this article. Maybe someone beat you to it.  \nClick OK to replace the current RfD tag (not recommended), or Cancel to abandon your nomination.")) {
					text = textNoAfd;
				} else {
					statelem.error("Article already tagged with RfD tag, and you chose to abort");
					window.location.reload();
					return;
				}
			}

			// Now we know we want to go ahead with it, trigger the other AJAX requests

			// Starting discussion page
			var wikipedia_page = new Morebits.wiki.page(params.discussionpage, "Creating article deletion discussion page");
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.afd.discussionPage);

			// Today's list
			var date = new Date();
			wikipedia_page = new Morebits.wiki.page('Wikipedia:Requests for deletion', "Adding discussion to today's list");
			wikipedia_page.setFollowRedirect(true);
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.afd.todaysList);


			// Notification to first contributor
			if (params.usertalk) {
				var thispage = new Morebits.wiki.page(mw.config.get('wgPageName'));
				thispage.setCallbackParameters(params);
				thispage.lookupCreator(Twinkle.xfd.callbacks.afd.userNotification);
			}

			// Then, test if there are speedy deletion-related templates on the article.
			var textNoSd = text.replace(/\{\{\s*(db(-\w*)?|qd|delete|(?:hang|hold)[\- ]?on)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, "");
			if (text !== textNoSd && confirm("A quick deletion tag was found on this page. Should it be removed?")) {
				text = textNoSd;
			}

			pageobj.setPageText(( params.noinclude ? "<noinclude>" : "" ) + "\{\{RfD|" + params.reason + "\}\}\n" + ( params.noinclude ? "</noinclude>" : "" ) + text);

			pageobj.setEditSummary("Nominated for deletion; see [[" + params.discussionpage + "]]." + Twinkle.getPref('summaryAd'));
			switch (Twinkle.getPref('xfdWatchPage')) {
				case 'yes':
					pageobj.setWatchlist(true);
					break;
				case 'no':
					pageobj.setWatchlistFromPreferences(false);
					break;
				default:
					pageobj.setWatchlistFromPreferences(true);
					break;
			}
			pageobj.setCreateOption('nocreate');
			pageobj.save();
		},
		discussionPage: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			pageobj.setPageText("{{subst:RfD/Preload/Template|deletereason=" + params.reason + "}}\n");
			pageobj.setEditSummary("Creating deletion discussion page for [[" + mw.config.get('wgPageName') + "]]." + Twinkle.getPref('summaryAd'));
			switch (Twinkle.getPref('xfdWatchDiscussion')) {
				case 'yes':
					pageobj.setWatchlist(true);
					break;
				case 'no':
					pageobj.setWatchlistFromPreferences(false);
					break;
				default:
					pageobj.setWatchlistFromPreferences(true);
					break;
			}
			pageobj.setCreateOption('createonly');
			pageobj.save(function() {
				Twinkle.xfd.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
			});
		},
		todaysList: function(pageobj) {
			var old_text = pageobj.getPageText() + "\n";  // MW strips trailing blanks, but we like them, so we add a fake one
			var params = pageobj.getCallbackParameters();
			var statelem = pageobj.getStatusElement();

			var text = old_text.replace( /(<\!-- Add new entries to the TOP of the following list -->\n+)/, "$1{{Wikipedia:Requests for deletion/Requests/" + ((new Date()).getUTCFullYear()) + '/' + mw.config.get('wgPageName') + params.numbering + "}}\n");
			if( text === old_text ) {
				statelem.error( 'failed to find target spot for the discussion' );
				return;
			}
			pageobj.setPageText(text);
			pageobj.setEditSummary("Adding [[" + params.discussionpage + "]]." + Twinkle.getPref('summaryAd'));
			switch (Twinkle.getPref('xfdWatchList')) {
				case 'yes':
					pageobj.setWatchlist(true);
					break;
				case 'no':
					pageobj.setWatchlistFromPreferences(false);
					break;
				default:
					pageobj.setWatchlistFromPreferences(true);
					break;
			}
			pageobj.setCreateOption('recreate');
			pageobj.save();
		},
		userNotification: function(pageobj) {
			var params = pageobj.getCallbackParameters();
			var initialContrib = pageobj.getCreator();
			var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "Notifying initial contributor (" + initialContrib + ")");
			var notifytext = "\n{{subst:RFDNote|1=" + mw.config.get('wgPageName') + "|2=" + mw.config.get('wgPageName') + ( params.numbering !== '' ? '|order=&#32;' + params.numbering : '' ) + "}} ~~~~";
			usertalkpage.setAppendText(notifytext);
			usertalkpage.setEditSummary("Notification: listing at [[WP:RfD|requests for deletion]] of [[" + mw.config.get('wgPageName') + "]]." + Twinkle.getPref('summaryAd'));
			usertalkpage.setCreateOption('recreate');
			switch (Twinkle.getPref('xfdWatchUser')) {
				case 'yes':
					usertalkpage.setWatchlist(true);
					break;
				case 'no':
					usertalkpage.setWatchlistFromPreferences(false);
					break;
				default:
					usertalkpage.setWatchlistFromPreferences(true);
					break;
			}
			usertalkpage.setFollowRedirect(true);
			usertalkpage.append();
		}
	}
};



Twinkle.xfd.callback.evaluate = function(e) {
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' '));  // for queen/king/whatever and country!

	var type =  e.target.category.value;
	var usertalk = e.target.notify.checked;
	var reason = e.target.xfdreason.value;
	var xfdtarget, xfdtarget2, puf, noinclude, tfdinline, notifyuserspace;

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Twinkle.xfd.currentRationale = reason;
	Morebits.status.onError(Twinkle.xfd.printRationale);

	if( !type ) {
		Morebits.status.error( 'Error', 'no action given' );
		return;
	}

	var query, wikipedia_page, wikipedia_api, logpage, params;
	var date = new Date();
	query = {
			'action': 'query',
			'list': 'allpages',
			'apprefix': 'Requests for deletion/Requests/' + ((new Date()).getUTCFullYear()) + '/' + mw.config.get('wgPageName'),
			'apnamespace': 4,
			'apfilterredir': 'nonredirects',
			'aplimit': Morebits.userIsInGroup( 'sysop' ) ? 5000 : 500
		};
		wikipedia_api = new Morebits.wiki.api( 'Tagging article with deletion tag', query, Twinkle.xfd.callbacks.afd.main );
		wikipedia_api.params = { usertalk:usertalk, reason:reason, noinclude:noinclude };
		wikipedia_api.post();
};
