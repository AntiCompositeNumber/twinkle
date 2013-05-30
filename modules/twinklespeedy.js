//<nowiki>


(function($){


/*
 ****************************************
 *** twinklespeedy.js: CSD module
 ****************************************
 * Mode of invocation:     Tab ("CSD")
 * Active on:              Non-special, existing pages
 * Config directives in:   TwinkleConfig
 *
 * NOTE FOR DEVELOPERS:
 *   If adding a new criterion, check out the default values of the CSD preferences
 *   in twinkle.header.js, and add your new criterion to those if you think it would
 *   be good.
 */

Twinkle.speedy = function twinklespeedy() {
	// Disable on:
	// * special pages
	// * non-existent pages
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
		return;
	}

	Twinkle.addPortletLink( Twinkle.speedy.callback, "QD", "tw-csd", Morebits.userIsInGroup('sysop') ? "Delete page according to WP:QD" : "Request speedy deletion according to WP:QD" );
};

// This function is run when the CSD tab/header link is clicked
Twinkle.speedy.callback = function twinklespeedyCallback() {
	if ( !Twinkle.userAuthorized ) {
		alert("Your account is too new to use Twinkle.");
		return;
	}

	Twinkle.speedy.initDialog(Morebits.userIsInGroup( 'sysop' ) ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
};

Twinkle.speedy.dialog = null;  // used by unlink feature

// Prepares the speedy deletion dialog and displays it
Twinkle.speedy.initDialog = function twinklespeedyInitDialog(callbackfunc) {
	var dialog;
	Twinkle.speedy.dialog = new Morebits.simpleWindow( Twinkle.getPref('speedyWindowWidth'), Twinkle.getPref('speedyWindowHeight') );
	dialog = Twinkle.speedy.dialog;
	dialog.setTitle( "Choose criteria for quick deletion" );
	dialog.setScriptName( "Twinkle" );
	dialog.addFooterLink( "Quick deletion policy", "Wikipedia:Deletion policy#Quick deletion" );
	dialog.addFooterLink( "Twinkle help", "WP:TW/DOC#speedy" );

	var form = new Morebits.quickForm( callbackfunc, (Twinkle.getPref('speedySelectionStyle') === 'radioClick' ? 'change' : null) );
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: 'Tag page only, don\'t delete',
						value: 'tag_only',
						name: 'tag_only',
						tooltip: 'If you just want to tag the page, instead of deleting it now',
						checked : Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							var cForm = event.target.form;
							var cChecked = event.target.checked;
							// enable/disable talk page checkbox
							if (cForm.talkpage) {
								cForm.talkpage.disabled = cChecked;
								cForm.talkpage.checked = !cChecked && Twinkle.getPref('deleteTalkPageOnDelete');
							}
							// enable/disable redirects checkbox
							cForm.redirects.disabled = cChecked;
							cForm.redirects.checked = !cChecked;

							// enable/disable notify checkbox
							cForm.notify.disabled = !cChecked;
							cForm.notify.checked = cChecked;
							// enable/disable multiple
							cForm.multiple.disabled = !cChecked;
							cForm.multiple.checked = false;

							Twinkle.speedy.callback.dbMultipleChanged(cForm, false);

							event.stopPropagation();
						}
					}
				]
			} );
		form.append( { type: 'header', label: 'Delete-related options' } );
		if (mw.config.get('wgNamespaceNumber') % 2 === 0 && (mw.config.get('wgNamespaceNumber') !== 2 || (/\//).test(mw.config.get('wgTitle')))) {  // hide option for user pages, to avoid accidentally deleting user talk page
			form.append( {
				type: 'checkbox',
				list: [
					{
						label: 'Also delete talk page',
						value: 'talkpage',
						name: 'talkpage',
						tooltip: "This option deletes the page's talk page in addition. If you choose the F8 (moved to Commons) criterion, this option is ignored and the talk page is *not* deleted.",
						checked: Twinkle.getPref('deleteTalkPageOnDelete'),
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		}
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: 'Also delete all redirects',
						value: 'redirects',
						name: 'redirects',
						tooltip: "This option deletes all incoming redirects in addition. Avoid this option for procedural (e.g. move/merge) deletions.",
						checked: true,
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		form.append( { type: 'header', label: 'Tag-related options' } );
	}

	form.append( {
			type: 'checkbox',
			list: [
				{
					label: 'Notify page creator if possible',
					value: 'notify',
					name: 'notify',
					tooltip: "A notification template will be placed on the talk page of the creator, IF you have a notification enabled in your Twinkle preferences " +
						"for the criterion you choose AND this box is checked. The creator may be welcomed as well.",
					checked: !Morebits.userIsInGroup( 'sysop' ) || Twinkle.getPref('deleteSysopDefaultToTag'),
					disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					event: function( event ) {
						event.stopPropagation();
					}
				}
			]
		} );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: 'Tag with multiple criteria',
					value: 'multiple',
					name: 'multiple',
					tooltip: "When selected, you can select several criteria that apply to the page. For example, G11 and A7 are a common combination for articles.",
					disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					event: function( event ) {
						Twinkle.speedy.callback.dbMultipleChanged( event.target.form, event.target.checked );
						event.stopPropagation();
					}
				}
			]
		} );

	form.append( {
			type: 'div',
			name: 'work_area',
			label: 'Failed to initialize the CSD module. Please try again, or tell the Twinkle developers about the issue.'
		} );

	if( Twinkle.getPref( 'speedySelectionStyle' ) !== 'radioClick' ) {
		form.append( { type: 'submit' } );
	}

	var result = form.render();
	dialog.setContent( result );
	dialog.display();

	Twinkle.speedy.callback.dbMultipleChanged( result, false );
};

Twinkle.speedy.callback.dbMultipleChanged = function twinklespeedyCallbackDbMultipleChanged(form, checked) {
	var namespace = mw.config.get('wgNamespaceNumber');
	var value = checked;

	var work_area = new Morebits.quickForm.element( {
			type: 'div',
			name: 'work_area'
		} );

	if (checked && Twinkle.getPref('speedySelectionStyle') === 'radioClick') {
		work_area.append( {
				type: 'div',
				label: 'When finished choosing criteria, click:'
			} );
		work_area.append( {
				type: 'button',
				name: 'submit-multiple',
				label: 'Submit Query',
				event: function( event ) {
					Twinkle.speedy.callback.evaluateUser( event );
					event.stopPropagation();
				}
			} );
	}

	var radioOrCheckbox = (value ? 'checkbox' : 'radio');

	if (namespace % 2 === 1 && namespace !== 3) {  // talk pages, but not user talk pages
		work_area.append( { type: 'header', label: 'Talk pages' } );
		work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.talkList } );
	}

	switch (namespace) {
		case 0:  // article
		case 1:  // talk
			work_area.append( { type: 'header', label: 'Articles' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.getArticleList(value) } );
			break;

		case 2:  // user
		case 3:  // user talk
			work_area.append( { type: 'header', label: 'User pages' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.userList } );
			break;

		case 6:  // file
		case 7:  // file talk
			work_area.append( { type: 'header', label: 'Files' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.getFileList(value) } );
			break;

		case 10:  // template
		case 11:  // template talk
			work_area.append( { type: 'header', label: 'Templates' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.templateList } );
			break;

		case 14:  // category
		case 15:  // category talk
			work_area.append( { type: 'header', label: 'Categories' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.categoryList } );
			break;

		default:
			break;
	}

	work_area.append( { type: 'header', label: 'General criteria' } );
	work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.getGeneralList(value) });

	work_area.append( { type: 'header', label: 'Redirects' } );
	work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.redirectList } );

	var old_area = Morebits.quickForm.getElements(form, "work_area")[0];
	form.replaceChild(work_area.render(), old_area);
};

Twinkle.speedy.talkList = [
	{
		label: 'G8: Talk pages with no page belonging to it',
		value: 'talk',
		tooltip: 'This does not include any page that is useful to the project - for example user talk pages, talk page archives, and talk pages for files that exist on Wikimedia Commons.'
	}
];

// this is a function to allow for db-multiple filtering
Twinkle.speedy.getFileList = function twinklespeedyGetFileList(multiple) {
	var result = [];
	result.push({
		label: 'F1: Not allowed',
		value: 'prohibitedimage',
		tooltip: 'Most media uploads are not allowed on Simple English Wikipedia. They should be uploaded to Wikimedia Commons instead. There are a few exceptions to this rule. Firstly, all spoken articles should be uploaded here, as they are for local use. Secondly, there are some logos that Commons does not accept, but are needed here, for example Image:Wiki.png, which is used as the Wikipedia logo.'
	});
	return result;
};

Twinkle.speedy.getArticleList = function twinklespeedyGetArticleList(multiple) {
	var result = [];
	result.push({
		label: 'A1: Little or no meaning',
		value: 'nocontext',
		tooltip: 'Is very short and providing little or no meaning (e.g., "He is a funny man that has created Factory and the Hacienda. And, by the way, his wife is great."). Having a small amount of content is not a reason to delete if it has useful information.'
	});
	result.push({
		label: 'A2: No content',
		value: 'nocontent',
		tooltip: 'Has no content. This includes any article consisting only of links (including hyperlinks, category tags and "see also" sections), a rephrasing of the title, and/or attempts to correspond with the person or group named by its title. This does not include disambiguation pages.'
	});
	result.push({
		label: 'A3: Article that exists on another Wikimedia project',
		value: 'transwiki',
		tooltip: 'Has been copied and pasted from another Wikipedia: Any article or section from an article that has been copied and pasted with little or no change.'
	});
	result.push({
		label: 'A4: People, groups, companies, products, services or websites that do not claim to be notable.',
		value: 'notability',
		tooltip: 'An article about a real person, group of people, band, club, company, product, service or or web content that does not say why it is important. If not everyone agrees that the subject is not notable or there has been a previous RfD, the article may not be quickly deleted, and should be discussed at RfD instead.'
	});
	result.push({
		label: 'A5: Not written in English',
		value: 'foreign',
		tooltip: 'Any article that is not written in English. An article that is written in any other languages but English.'
	});
	result.push({
		label: 'A6: Obvious hoax',
		value: 'hoax',
		tooltip: 'Is an obvious hoax. An article that is surely fake or impossible.'
	});
	return result;
};

Twinkle.speedy.categoryList = [
	{
		label: 'C1: Empty categories',
		value: 'catempty',
		tooltip: '(with no articles or subcategories for at least four days) whose only content includes links to parent categories. However, this can not be used on categories still being discussed on WP:RfD, or disambiguation categories. If the category wasn\'t newly made, it is possible that it used to have articles, and more inspection is needed.'
	},
	{
		label: 'C2: Quick renaming',
		value: 'catqr',
		tooltip: 'Empty categories that have already been renamed.'
	},
	{
		label: 'C3: Template categories',
		value: 'catfd',
		tooltip: 'If a category contains articles from only one template (such as Category:Cleanup needed from \{\{cleanup\}\}) and the template is deleted after being discussed, the category can also be deleted without being discussed.'
	}
];

Twinkle.speedy.userList = [
	{
		label: 'U1: User request',
		value: 'userreq',
		tooltip: 'User pages can be deleted if its user wants to, but there are some exceptions.'
	},
	{
		label: 'U2: Nonexistent user',
		value: 'nouser',
		tooltip: 'User pages of users that do not exist. Administrators should check Special:Contributions and Special:DeletedContributions.'
	}
];

Twinkle.speedy.templateList = [
		{
		label: 'T2: They are deprecated or replaced by a newer template and are completely unused and not linked to.',
		value: 'replaced',
		tooltip: 'For any template that should not be deleted quickly, use Wikipedia:Requests for deletion.'
		}
	//});
	//	return result;
];

Twinkle.speedy.getGeneralList = function twinklespeedyGetGeneralList(multiple) {
	var result = [];
	if (!multiple) {
		result.push({
			label: 'Custom rationale' + (Morebits.userIsInGroup('sysop') ? ' (custom deletion reason)' : ' using {'+'{QD|reason}}'),
			value: 'reason',
			tooltip: 'You can enter an custom reason.'
		});
	}
	result.push({
		label: 'G1: Nonsense',
		value: 'nonsense',
		tooltip: 'All of the text is nonsense. Nonsense includes content that does not make sense or is not meaningful. However, this does not include bad writing, bad words, vandalism, things that are fake or impossible, or parts which are not in English. '
	});
	result.push({
		label: 'G2: Test page',
		value: 'test',
		tooltip: 'It is a test page, such as "Can I really create a page here?".'
	});
	result.push({
		label: 'G3: Complete vandalism',
		value: 'vandalism',
		tooltip: 'The content is completely vandalism.'
	});
	result.push({
		label: 'G4: Recreation of deleted material already deleted at RfD',
		value: 'repost',
		tooltip: 'Creation of content that is already deleted. It includes an identical or similar copy, with any title, of a page that was deleted, after being discussed in Requests for deletion, unless it was undeleted due to another discussion or was recreated in the user space. Before deleting again, the Administrator should be sure that the content is similar and not just a new article on the same subject. This rule cannot be used if the content had already been quickly deleted before.'
	});
	if (!multiple) {
		result.push({
			label: 'G6: History merge',
			value: 'histmerge',
			tooltip: 'Temporarily deleting a page in order to merge page histories'
		});
		result.push({
			label: 'G6: Move',
			value: 'move',
			tooltip: 'Making way for a noncontroversial move like reversing a redirect'
		});
		result.push({
			label: 'G6: RfD',
			value: 'afd',
			tooltip: 'An admin has closed a RfD as "delete".'
		});
		}
	result.push({
		label: 'G6: Housekeeping',
		value: 'g6',
		tooltip: 'Other non-controversial "housekeeping" tasks'
	});
	result.push({
		label: 'G7: Author requests deletion, or author blanked',
		value: 'author',
		tooltip: 'Any page whose original author wants deletion, can be quickly deleted, but only if most of the page was written by that author and was created as a mistake. If the author blanks the page, this can mean that he or she wants it deleted.'
	});
	result.push({
		label: 'G8: Pages dependent on a non-existent or deleted page',
		value: 'talk',
		tooltip: '... can be deleted, unless they contain discussion on deletion that can\'t be found anywhere else. Subpages of a talk page can only be deleted under this rule if their top-level page does not exist. This also applies to broken redirects. However, this cannot be used on user talk pages or talk pages of images on Commons.'
	});
	if (!multiple) {
		result.push({
			label: 'G8: Subpages with no parent page',
			value: 'subpage',
			tooltip: 'This excludes any page that is useful to the project, and in particular: deletion discussions that are not logged elsewhere, user and user talk pages, talk page archives, plausible redirects that can be changed to valid targets, and file pages or talk pages for files that exist on Wikimedia Commons.'
		});
	}
	result.push({
		label: 'G10: Attack page',
		value: 'attack',
		tooltip: 'Pages that were only created to insult a person or thing (such as "John Q. Doe is dumb"). This includes articles on a living person that is insult and without sources, where there is no NPOV version in the edit history to revert to.'
	});
	result.push({
		label: 'G11: Obvious advertising',
		value: 'spam',
		tooltip: 'Pages which were created only to say good things about a company, item, group or service and which would need to be written again so that they can sound like an encyclopedia. However, simply having a company, item, group or service as its subject does not mean that an article can be deleted because of this rule: an article that is obvious advertising should have content that shouldn\'t be in an encyclopedia. If a page has already gone through RfD or QD and was not deleted, it should not be quickly deleted using this rule.'
	});
	result.push({
		label: 'G12: Obviously breaking copyright law',
		value: 'copyvio',
		tooltip: 'Obviously breaking copyright law like a page which is 1) Copied from another website which does not have a license that can be used with Wikipedia; 2) Containing no content in the page history that is worth being saved. 3) Made by one person instead of being created on wiki and then copied by another website such as one of the many Wikipedia mirror websites. 4) Added by someone who doesn\'t tell if he got permission to do so or not, or if his claim has a large chance of not being true;'
	});
	return result;
};

Twinkle.speedy.redirectList = [
	{
		label: 'R1: Redirects to a non-existent page.',
		value: 'redirnone',
		tooltip: 'Redirects to a non-existent page.'
	},
	{
		label: 'R2: Redirects from mainspace to any other namespace except the Category:, Template:, Wikipedia:, Help: and Portal: namespaces',
		value: 'rediruser',
		tooltip: '(this does not include the Wikipedia shortcut pseudo-namespaces). If this was the result of a page move, consider waiting a day or two before deleting the redirect'
	},
	{
		label: 'R3: Redirects as a result of an implausible typo that were recently created',
		value: 'redirtypo',
		tooltip: 'However, redirects from common misspellings or misnomers are generally useful, as are redirects in other languages'
	}
];

Twinkle.speedy.normalizeHash = {
	'reason': 'db',
	'nonsense': 'g1',
	'test': 'g2',
	'vandalism': 'g3',
	'hoax': 'g3',
	'repost': 'g4',
	'histmerge': 'g6',
	'move': 'g6',
	'afd': 'g6',
	'g6': 'g6',
	'author': 'g7',
	'talk': 'g8',
	'subpage': 'g8',
	'attack': 'g10',
	'spam': 'g11',
	'copyvio': 'g12',
	'nocontext': 'a1',
	'nocontent': 'a2',
	'transwiki': 'a3',
	'notability': 'a4',
	'foreign': 'a5',
	'hoax': 'a6',
	'redirnone': 'r1',
	'rediruser': 'r2',
	'redirtypo': 'r3',
	'prohibitedimage': 'f1',
	'catempty': 'c1',
	'catqr': 'c2',
	'catfd': 'c3',
	'userreq': 'u1',
	'nouser': 'u2',
	'replaced':'t2'
};

// keep this synched with [[MediaWiki:Deletereason-dropdown]]
Twinkle.speedy.reasonHash = {
	'reason': '',
		'nonsense': 'was all nonsense',
		'test': 'was a test page',
		'vandalism': 'was vandalism',
		'pagemove': 'was a redirect created during cleanup of page move vandalism',
		'repost': 'was a copy of a page that was deleted by RfD',
		'histmerge': 'was in the way of trying to fix or clean up something',
		'move': 'was in the way of making a move',
		'afd': 'was closed as delete in a RfD',
		'g6': 'was housekeeping',
		'author': 'was asked to be deleted by the author',
		'blanked': 'was implied to be deleted by the author',
		'talk': 'was a talk page of a page that does not exist',
		'attack': 'was an attack page',
		'spam': 'was advertising',
		'copyvio': 'was breaking copyright law',
		'nocontext': 'was a page that had little or no meaning',
		'nocontent': 'was a page that had no content',
		'transwiki': 'was copied from another Wikipedia',
		'notability': 'was a page that didn\'t say why the subject was notable',
		'foreign': 'was not written in English',
		'hoax': 'was obviously a hoax (not true)',
		'redirnone': 'was a redirect to a page that does not exist',
		'rediruser': 'was a redirect to the Talk:, User: or User talk: space',
		'redirtypo': 'was a redirect with an uncommon typo',
		'prohibitedimage': 'was an image/media that is not allowed on Wikipedia',
		'catempty': 'was an empty category',
		'catqr': 'was a renamed category',
		'catfd': 'was a category containing articles from a now deleted template',
		'userreq': 'was a user page whose user requested deletion',
		'nouser': 'was a user page of a user that did not exist',
		'replaced': 'was deprecated or replaced by a newer template and are completely unused and not linked to'
};

Twinkle.speedy.callbacks = {
	sysop: {
		main: function( params ) {
			var thispage = new Morebits.wiki.page( mw.config.get('wgPageName'), "Deleting page" );

			// delete page
			var reason;
			if (params.normalized === 'db') {
				reason = prompt("Enter the deletion summary to use, which will be entered into the deletion log:", "");
			} else {
				var presetReason = "[[WP:QD#" + params.normalized.toUpperCase() + "|" + params.normalized.toUpperCase() + "]]: " + params.reason;
				if (Twinkle.getPref("promptForSpeedyDeletionSummary").indexOf(params.normalized) !== -1) {
					reason = prompt("Enter the deletion summary to use, or press OK to accept the automatically generated one.", presetReason);
				} else {
					reason = presetReason;
				}
			}
			if (!reason || !reason.replace(/^\s*/, "").replace(/\s*$/, "")) {
				Morebits.status.error("Asking for reason", "you didn't give one.  I don't know... what with admins and their apathetic antics... I give up...");
				return;
			}
			thispage.setEditSummary( reason + Twinkle.getPref('deletionSummaryAd') );
			thispage.deletePage();

			// delete talk page
			if (params.deleteTalkPage &&
			    params.normalized !== 'f8' &&
			    document.getElementById( 'ca-talk' ).className !== 'new') {
				var talkpage = new Morebits.wiki.page( Morebits.wikipedia.namespaces[ mw.config.get('wgNamespaceNumber') + 1 ] + ':' + mw.config.get('wgTitle'), "Deleting talk page" );
				talkpage.setEditSummary('[[WP:QD#G8|G8]]: Talk page of deleted page "' + mw.config.get('wgPageName') + '"' + Twinkle.getPref('deletionSummaryAd'));
				talkpage.deletePage();
			}

			// promote Unlink tool
			var $link, $bigtext;
			if( mw.config.get('wgNamespaceNumber') === 6 && params.normalized !== 'f8' ) {
				$link = $('<a/>', {
					'href': '#',
					'text': 'click here to go to the Unlink tool',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("Removing usages of and/or links to deleted file " + mw.config.get('wgPageName'));
					}
				});
				$bigtext = $('<span/>', {
					'text': 'To orphan backlinks and remove instances of file usage',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			} else if (params.normalized !== 'f8') {
				$link = $('<a/>', {
					'href': '#',
					'text': 'click here to go to the Unlink tool',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("Removing links to deleted page " + mw.config.get('wgPageName'));
					}
				});
				$bigtext = $('<span/>', {
					'text': 'To orphan backlinks',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			}

			// open talk page of first contributor
			if( params.openusertalk ) {
				thispage = new Morebits.wiki.page( mw.config.get('wgPageName') );  // a necessary evil, in order to clear incorrect status text
				thispage.setCallbackParameters( params );
				thispage.lookupCreator( Twinkle.speedy.callbacks.sysop.openUserTalkPage );
			}

			// delete redirects
			if (params.deleteRedirects) {
				var query = {
					'action': 'query',
					'list': 'backlinks',
					'blfilterredir': 'redirects',
					'bltitle': mw.config.get('wgPageName'),
					'bllimit': 5000  // 500 is max for normal users, 5000 for bots and sysops
				};
				var wikipedia_api = new Morebits.wiki.api( 'getting list of redirects...', query, Twinkle.speedy.callbacks.sysop.deleteRedirectsMain,
					new Morebits.status( 'Deleting redirects' ) );
				wikipedia_api.params = params;
				wikipedia_api.post();
			}
		},
		openUserTalkPage: function( pageobj ) {
			pageobj.getStatusElement().unlink();  // don't need it anymore
			var user = pageobj.getCreator();
			var statusIndicator = new Morebits.status('Opening user talk page edit form for ' + user, 'opening...');

			var query = {
				'title': 'User talk:' + user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': mw.config.get('wgPageName').replace(/_/g, ' ')
			};
			switch( Twinkle.getPref('userTalkPageMode') ) {
			case 'tab':
				window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_tab' );
				break;
			case 'blank':
				window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
				break;
			case 'window':
				/* falls through */
				default :
				window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), 'twinklewarnwindow', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
				break;
			}

			statusIndicator.info( 'complete' );
		},
		deleteRedirectsMain: function( apiobj ) {
			var xmlDoc = apiobj.getXML();
			var $snapshot = $(xmlDoc).find('backlinks bl');

			var total = $snapshot.length;

			if( !total ) {
				return;
			}

			var statusIndicator = apiobj.statelem;
			statusIndicator.status("0%");

			var onsuccess = function( apiobj ) {
				var obj = apiobj.params.obj;
				var total = apiobj.params.total;
				var now = parseInt( 100 * ++(apiobj.params.current)/total, 10 ) + '%';
				obj.update( now );
				apiobj.statelem.unlink();
				if( apiobj.params.current >= total ) {
					obj.info( now + ' (completed)' );
					Morebits.wiki.removeCheckpoint();
				}
			};

			Morebits.wiki.addCheckpoint();

			var params = $.extend( {}, apiobj.params );
			params.current = 0;
			params.total = total;
			params.obj = statusIndicator;

			$snapshot.each(function(key, value) {
				var title = $(value).attr('title');
				var page = new Morebits.wiki.page(title, 'Deleting redirect "' + title + '"');
				page.setEditSummary('[[WP:QD#G8|G8]]: Redirect to deleted page "' + mw.config.get('wgPageName') + '"' + Twinkle.getPref('deletionSummaryAd'));
				page.deletePage(onsuccess);
			});
		}
	},

	user: {
		main: function(pageobj) {
			var statelem = pageobj.getStatusElement();

			if (!pageobj.exists()) {
				statelem.error( "It seems that the page doesn't exist; perhaps it has already been deleted" );
				return;
			}

			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			statelem.status( 'Checking for tags on the page...' );

			// check for existing deletion tags
			var tag = /(?:\{\{\s*(qd|qd-multiple|db|delete|db-.*?)(?:\s*\||\s*\}\}))/.exec( text );
			if( tag ) {
				statelem.error( [ Morebits.htmlNode( 'strong', tag[1] ) , " is already placed on the page." ] );
				return;
			}

			var xfd = /(?:\{\{([rsaiftcm]fd|md1|proposed deletion)[^{}]*?\}\})/i.exec( text );
			if( xfd && !confirm( "The deletion-related template {{" + xfd[1] + "}} was found on the page. Do you still want to add a CSD template?" ) ) {
				return;
			}

			var code, parameters, i;
			if (params.normalizeds.length > 1)
			{
				code = "{{QD-multiple";
				var breakFlag = false;
				$.each(params.normalizeds, function(index, norm) {
					code += "|" + norm.toUpperCase();
					parameters = Twinkle.speedy.getParameters(params.values[index], norm, statelem);
					if (!parameters) {
						breakFlag = true;
						return false;  // the user aborted
					}
					for (i in parameters) {
						if (typeof parameters[i] === 'string' && !parseInt(i, 10)) {  // skip numeric parameters - {{db-multiple}} doesn't understand them
							code += "|" + i + "=" + parameters[i];
						}
					}
				});
				if (breakFlag) {
					return;
				}
				code += "}}";
				params.utparams = [];
			}
			else
			{
				parameters = Twinkle.speedy.getParameters(params.values[0], params.normalizeds[0], statelem);
				if (!parameters) {
					return;  // the user aborted
				}
				code = "{{qd|" + params.normalizeds;
				for (i in parameters) {
					if (typeof parameters[i] === 'string') {
						code += "|" + i + "=" + parameters[i];
					}
				}
				code += "|editor=" + mw.config.get("wgUserName") + "|date=~~~~~";
				code += "}}";
				params.utparams = Twinkle.speedy.getUserTalkParameters(params.normalizeds[0], parameters);
			}

			var thispage = new Morebits.wiki.page(mw.config.get('wgPageName'));
			// patrol the page, if reached from Special:NewPages
			if( Twinkle.getPref('markSpeedyPagesAsPatrolled') ) {
				thispage.patrol();
			}

			// Wrap SD template in noinclude tags if we are in template space.
			// Won't work with userboxes in userspace, or any other transcluded page outside template space
			if (mw.config.get('wgNamespaceNumber') === 10) {  // Template:
				code = "<noinclude>" + code + "</noinclude>";
			}

			// Remove tags that become superfluous with this action
			if (mw.config.get('wgNamespaceNumber') === 6) {
				// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
				text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, "");
			}

			// Generate edit summary for edit
			var editsummary;
			if (params.normalizeds.length > 1) {
				editsummary = 'Requesting quick deletion (';
				$.each(params.normalizeds, function(index, norm) {
					editsummary += '[[WP:QD#' + norm.toUpperCase() + '|QD ' + norm.toUpperCase() + ']], ';
				});
				editsummary = editsummary.substr(0, editsummary.length - 2); // remove trailing comma
				editsummary += ').';
			} else if (params.normalizeds[0] === "db") {
				editsummary = 'Requesting [[WP:QD|quick deletion]] with criteria \"' + parameters["1"] + '\".';
			} else if (params.values[0] === "histmerge") {
				editsummary = "Requesting history merge with [[" + parameters["1"] + "]] ([[WP:QD#G6|QD G6]]).";
			} else {
				editsummary = "Requesting quick deletion ([[WP:QD#" + params.normalizeds[0].toUpperCase() + "|QD " + params.normalizeds[0].toUpperCase() + "]]).";
			}

			pageobj.setPageText(code + ((params.normalizeds.indexOf('g10') !== -1) ? '' : ("\n" + text) )); // cause attack pages to be blanked
			pageobj.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
			pageobj.setWatchlist(params.watch);
			pageobj.setCreateOption('nocreate');
			pageobj.save(Twinkle.speedy.callbacks.user.tagComplete);
		},

		tagComplete: function(pageobj) {
			var params = pageobj.getCallbackParameters();

			// Notification to first contributor
			if (params.usertalk) {
				var callback = function(pageobj) {
					var initialContrib = pageobj.getCreator();

					// don't notify users when their user talk page is nominated
					if (initialContrib === mw.config.get('wgTitle') && mw.config.get('wgNamespaceNumber') === 3) {
						Morebits.status.warn("Notifying initial contributor: this user created their own user talk page; skipping notification");
						return;
					}

					var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "Notifying initial contributor (" + initialContrib + ")"),
					    notifytext, i;

					// specialcase "db" and "db-multiple"
					if (params.normalizeds.length > 1) {
						notifytext = "\n{{subst:QD-notice-multiple|page=" + mw.config.get('wgPageName');
						var count = 2;
						$.each(params.normalizeds, function(index, norm) {
							notifytext += "|" + (count++) + "=" + norm.toUpperCase();
						});
					} else if (params.normalizeds[0] === "db") {
						notifytext = "\n{{subst:QD-notice|page=" + mw.config.get('wgPageName') + "|cat=" + params.normalizeds;
					} else {
						notifytext = "\n{{subst:QD-notice|page=" + mw.config.get('wgPageName') + "|cat=" + params.normalizeds;
					}

					for (i in params.utparams) {
						if (typeof params.utparams[i] === 'string') {
							notifytext += "|" + i + "=" + params.utparams[i];
						}
					}
					notifytext += (params.welcomeuser ? "" : "|nowelcome=yes") + "}} ~~~~";

					usertalkpage.setAppendText(notifytext);
					usertalkpage.setEditSummary("Notification: quick deletion nomination of [[" + mw.config.get('wgPageName') + "]]." + Twinkle.getPref('summaryAd'));
					usertalkpage.setCreateOption('recreate');
					usertalkpage.setFollowRedirect(true);
					usertalkpage.append();

					// add this nomination to the user's userspace log, if the user has enabled it
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
					}
				};
				var thispage = new Morebits.wiki.page(mw.config.get('wgPageName'));
				thispage.lookupCreator(callback);
			}
			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			else if (params.lognomination) {
				Twinkle.speedy.callbacks.user.addToLog(params, null);
			}
		},

		// note: this code is also invoked from twinkleimage
		// the params used are:
		//   for CSD: params.values, params.normalizeds  (note: normalizeds is an array)
		//   for DI: params.fromDI = true, params.type, params.normalized  (note: normalized is a string)
		addToLog: function(params, initialContrib) {
			var wikipedia_page = new Morebits.wiki.page("User:" + mw.config.get('wgUserName') + "/" + Twinkle.getPref('speedyLogPageName'), "Adding entry to userspace log");
			params.logInitialContrib = initialContrib;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.speedy.callbacks.user.saveLog);
		},

		saveLog: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			// add blurb if log page doesn't exist
			if (!pageobj.exists()) {
				text =
					"This is a log of all [[WP:QD|quick deletion]] nominations made by this user using [[WP:TW|Twinkle]]'s QD module.\n\n" +
					"If you no longer wish to keep this log, you can turn it off using the [[Wikipedia:Twinkle/Preferences|preferences panel]], and " +
					"nominate this page for speedy deletion under [[WP:QD#U1|QD U1]].\n";
				if (Morebits.userIsInGroup("sysop")) {
					text += "\nThis log does not track outright speedy deletions made using Twinkle.\n";
				}
			}

			// create monthly header
			var date = new Date();
			var headerRe = new RegExp("^==+\\s*" + date.getUTCMonthName() + "\\s+" + date.getUTCFullYear() + "\\s*==+", "m");
			if (!headerRe.exec(text)) {
				text += "\n\n=== " + date.getUTCMonthName() + " " + date.getUTCFullYear() + " ===";
			}

			text += "\n# [[:" + mw.config.get('wgPageName') + "]]: ";
			if (params.fromDI) {
				text += "DI [[WP:QD#" + params.normalized.toUpperCase() + "|QD " + params.normalized.toUpperCase() + "]] (" + params.type + ")";
			} else {
				if (params.normalizeds.length > 1) {
					text += "multiple criteria (";
					$.each(params.normalizeds, function(index, norm) {
						text += "[[WP:QD#" + norm.toUpperCase() + "|" + norm.toUpperCase() + ']], ';
					});
					text = text.substr(0, text.length - 2);  // remove trailing comma
					text += ')';
				} else if (params.normalizeds[0] === "db") {
					text += "{{tl|QD}}";
				} else {
					text += "[[WP:QD#" + params.normalizeds[0].toUpperCase() + "|CSD " + params.normalizeds[0].toUpperCase() + "]] ({{tl|db-" + params.values[0] + "}})";
				}
			}

			if (params.logInitialContrib) {
				text += "; notified {{user|" + params.logInitialContrib + "}}";
			}
			text += " ~~~~~\n";

			pageobj.setPageText(text);
			pageobj.setEditSummary("Logging quick deletion nomination of [[" + mw.config.get('wgPageName') + "]]." + Twinkle.getPref('summaryAd'));
			pageobj.setCreateOption("recreate");
			pageobj.save();
		}
	}
};

// prompts user for parameters to be passed into the speedy deletion tag
Twinkle.speedy.getParameters = function twinklespeedyGetParameters(value, normalized, statelem)
{
	var parameters = [];
	switch( normalized ) {
		case 'db':
			var dbrationale = prompt('Please enter a custom reason.   \n\"This page can be quickly deleted because:\"', "");
			if (!dbrationale || !dbrationale.replace(/^\s*/, "").replace(/\s*$/, ""))
			{
				statelem.error( 'You must specify a reason. Aborted by user.' );
				return null;
			}
			parameters["1"] = dbrationale;
			break;
		case 'g12':
			var url = prompt( '[QD G12] Please enter the URL if available, including the "http://":', "" );
			if (url === null)
			{
				statelem.error( 'Aborted by user.' );
				return null;
			}
			parameters.url = url;
			break;
		default:
			var defaultreason = prompt('You can enter more details here.  \n' +
				"Just click OK if you don't want or need to.", "");
			if (defaultreason === null) {
				return true;  // continue to next tag
			} else if (defaultreason !== "") {
				parameters["2"] = defaultreason;
			}
			break;
	}
	return parameters;
};

// function for processing talk page notification template parameters
Twinkle.speedy.getUserTalkParameters = function twinklespeedyGetUserTalkParameters(normalized, parameters)
{
	var utparams = [];
	switch (normalized)
	{
		case 'db':
			utparams["2"] = parameters["1"];
			break;
		case 'a10':
			utparams.key1 = "article";
			utparams.value1 = parameters.article;
			break;
		default:
			break;
	}
	return utparams;
};


Twinkle.speedy.resolveCsdValues = function twinklespeedyResolveCsdValues(e) {
	var values = (e.target.form ? e.target.form : e.target).getChecked('csd');
	if (values.length === 0) {
		alert( "Please select a criterion!" );
		return null;
	}
	return values;
};

Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e)
{
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' ')); // for queen/king/whatever and country!
	var form = (e.target.form ? e.target.form : e.target);

	var tag_only = form.tag_only;
	if( tag_only && tag_only.checked ) {
		Twinkle.speedy.callback.evaluateUser(e);
		return;
	}

	var value = Twinkle.speedy.resolveCsdValues(e)[0];
	if (!value) {
		return;
	}
	var normalized = Twinkle.speedy.normalizeHash[ value ];

	var params = {
		value: value,
		normalized: normalized,
		watch: Twinkle.getPref('watchSpeedyPages').indexOf( normalized ) !== -1,
		reason: Twinkle.speedy.reasonHash[ value ],
		openusertalk: Twinkle.getPref('openUserTalkPageOnSpeedyDelete').indexOf( normalized ) !== -1,
		deleteTalkPage: form.talkpage && form.talkpage.checked,
		deleteRedirects: form.redirects.checked
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Twinkle.speedy.callbacks.sysop.main( params );
};

Twinkle.speedy.callback.evaluateUser = function twinklespeedyCallbackEvaluateUser(e) {
	mw.config.set('wgPageName', mw.config.get('wgPageName').replace(/_/g, ' '));  // for queen/king/whatever and country!
	var form = (e.target.form ? e.target.form : e.target);

	if (e.target.type === "checkbox") {
		return;
	}

	var values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}
	//var multiple = form.multiple.checked;
	var normalizeds = [];
	$.each(values, function(index, value) {
		var norm = Twinkle.speedy.normalizeHash[ value ];

		// for sysops only
		if (['f4', 'f5', 'f6', 'f11'].indexOf(norm) !== -1) {
			alert("Tagging with F4, F5, F6, and F11 is not possible using the CSD module.  Try using DI instead, or unchecking \"Tag page only\" if you meant to delete the page.");
			return;
		}

		normalizeds.push(norm);
	});

	// analyse each criterion to determine whether to watch the page/notify the creator
	var watchPage = false;
	$.each(normalizeds, function(index, norm) {
		if (Twinkle.getPref('watchSpeedyPages').indexOf(norm) !== -1) {
			watchPage = true;
			return false;  // break
		}
	});

	var notifyuser = false;
	if (form.notify.checked) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('notifyUserOnSpeedyDeletionNomination').indexOf(norm) !== -1) {
				notifyuser = true;
				return false;  // break
			}
		});
	}

	var welcomeuser = false;
	if (notifyuser) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').indexOf(norm) !== -1) {
				welcomeuser = true;
				return false;  // break
			}
		});
	}

	var csdlog = false;
	if (Twinkle.getPref('logSpeedyNominations')) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('noLogOnSpeedyNomination').indexOf(norm) === -1) {
				csdlog = true;
				return false;  // break
			}
		});
	}

	var params = {
		values: values,
		normalizeds: normalizeds,
		watch: watchPage,
		usertalk: notifyuser,
		welcomeuser: welcomeuser,
		lognomination: csdlog
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "Tagging complete";

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "Tagging page");
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
};
})(jQuery);


//</nowiki>
