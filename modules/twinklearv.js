/*
 ****************************************
 *** twinklearv.js: ARV module
 ****************************************
 * Mode of invocation:     Tab ("ARV")
 * Active on:              Existing and non-existing user pages, user talk pages, contributions pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.arv = function twinklearv() {

	var username = Morebits.getPageAssociatedUser();
	if ( username === false ) {
		return;
	}

	var title = Morebits.isIPAddress( username ) ? 'Report IP to administrators' : 'Report user to administrators';

	twAddPortletLink( function(){ Twinkle.arv.callback(username); }, "VIP", "tw-arv", title );
};

Twinkle.arv.callback = function ( uid ) {
	if ( !twinkleUserAuthorized ) {
		alert("Your account is too new to use Twinkle.");
		return;
	}
	if ( uid === mw.config.get('wgUserName') ) {
		alert( 'You don\'t want to report yourself, do you?' );
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 500 );
	Window.setTitle( "Vandalism in progress" ); //changed title
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Twinkle help", "WP:TW/DOC#arv" );

	var form = new Morebits.quickForm( Twinkle.arv.callback.evaluate );
	var categories = form.append( {
			type: 'select',
			name: 'category',
			label: 'Select report type: ',
			event: Twinkle.arv.callback.changeCategory
		} );
	categories.append( {
			type: 'option',
			label: 'Vandalism (WP:VIP)',
			value: 'aiv'
		} );
	form.append( {
			type: 'field',
			label:'Work area',
			name: 'work_area'
		} );
	form.append( { type:'submit' } );
	form.append( {
			type: 'hidden',
			name: 'uid',
			value: uid
		} );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.category.dispatchEvent( evt );
};

Twinkle.arv.callback.changeCategory = function (e) {
	var value = e.target.value;
	var root = e.target.form;
	var old_area = Morebits.quickForm.getElements(root, "work_area")[0];
	var work_area = null;

	switch( value ) {
	case 'aiv':
		/* falls through */
	default:
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: 'Report user for vandalism',
				name: 'work_area'
			} );
		work_area.append( {
				type: 'input',
				name: 'page',
				label: 'Primary linked page: ',
				tooltip: 'Leave blank to not link to the page in the report',
				value: Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '',
				event: function(e) {
					var value = e.target.value;
					var root = e.target.form;
					if( value === '' ) {
						root.badid.disabled = root.goodid.disabled = true;
					} else {
						root.badid.disabled = false;
						root.goodid.disabled = root.badid.value === '';
					}
				}
			} );
		work_area.append( {
				type: 'input',
				name: 'badid',
				label: 'Revision ID for target page when vandalised: ',
				tooltip: 'Leave blank for no diff link',
				value: Morebits.queryString.exists( 'vanarticlerevid' ) ? Morebits.queryString.get( 'vanarticlerevid' ) : '',
				disabled: !Morebits.queryString.exists( 'vanarticle' ),
				event: function(e) {
					var value = e.target.value;
					var root = e.target.form;
					root.goodid.disabled = value === '';
				}
			} );
		work_area.append( {
				type: 'input',
				name: 'goodid',
				label: 'Last good revision ID before vandalism of target page: ',
				tooltip: 'Leave blank for diff link to previous revision',
				value: Morebits.queryString.exists( 'vanarticlegoodrevid' ) ? Morebits.queryString.get( 'vanarticlegoodrevid' ) : '',
				disabled: !Morebits.queryString.exists( 'vanarticle' ) || Morebits.queryString.exists( 'vanarticlerevid' )
			} );
		work_area.append( {
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: 'Vandalism after final (level 4 or 4im) warning given',
						value: 'final'
					},
					{
						label: 'Vandalism after recent (within 1 day) release of block',
						value: 'postblock'
					},
					{
						label: 'Evidently a vandalism-only account',
						value: 'vandalonly',
						disabled: Morebits.isIPAddress( root.uid.value )
					},
					{
						label: 'Account is evidently a spambot or a compromised account',
						value: 'spambot'
					},
					{
						label: 'Account is a promotion-only account',
						value: 'promoonly'
					}
				]
			} );
		work_area.append( {
				type: 'textarea',
				name: 'reason',
				label: 'Comment: '
			} );
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	}
};

Twinkle.arv.callback.evaluate = function(e) {

	var form = e.target;
	var reason = "";
	var comment = "";
	if ( form.reason ) {
		comment = form.reason.value;
	}
	var uid = form.uid.value;

	var types;
	switch( form.category.value ) {

		// Report user for vandalism
		case 'aiv':
			/* falls through */
		default:
			types = form.getChecked( 'arvtype' );
			if( !types.length && comment === '' ) {
				alert( 'You must specify some reason' );
				return;
			}

			types = types.map( function(v) {
					switch(v) {
						case 'final':
							return 'vandalism after final warning';
						case 'postblock':
							return 'vandalism after recent release of block';
						case 'spambot':
							return 'account is evidently a spambot or a compromised account';
						case 'vandalonly':
							return 'actions evidently indicate a vandalism-only account';
						case 'promoonly':
							return 'account is being used only for promotional purposes';
						default:
							return 'unknown reason';
					}
				} ).join( '; ' );


			if ( form.page.value !== '' ) {

				// add a leading : on linked page namespace to prevent transclusion
				reason = 'On [[' + form.page.value.replace( /^(Image|Category|File):/i, ':$1:' ) + ']]';

				if ( form.badid.value !== '' ) {
					var query = {
						'title': form.page.value,
						'diff': form.badid.value,
						'oldid': form.goodid.value
					};
					reason += ' ({{diff|' + form.page.value + '|' + form.badid.value + '|' + form.goodid.value + '|diff}})';
				}
				reason += ':';
			}

			if ( types ) {
				reason += " " + types;
			}
			if (comment !== "" ) {
				reason += (reason === "" ? "" : ". ") + comment;
			}
			reason += ". ~~~~";
			reason = reason.replace(/\r?\n/g, "\n*:");  // indent newlines

			Morebits.simpleWindow.setButtonsEnabled( false );
			Morebits.status.init( form );

			Morebits.wiki.actionCompleted.redirect = "Wikipedia:Vandalism in progress";
			Morebits.wiki.actionCompleted.notice = "Reporting complete";

			var aivPage = new Morebits.wiki.page( 'Wikipedia:Vandalism in progress', 'Processing VIP request' );
			aivPage.setPageSection( 3 );
			aivPage.setFollowRedirect( true );

			aivPage.load( function() {
				var text = aivPage.getPageText();

				// check if user has already been reported
				if (new RegExp( "\\{\\{\\s*(?:(?:[Ii][Pp])?[Vv]andal|[Uu]serlinks)\\s*\\|\\s*(?:1=)?\\s*" + RegExp.escape( uid, true ) + "\\s*\\}\\}" ).test(text)) {
					aivPage.getStatusElement().info( 'Report already present, will not add a new one' );
					return;
				}
				aivPage.getStatusElement().status( 'Adding new report...' );
				aivPage.setEditSummary( 'Reporting [[Special:Contributions/' + uid + '|' + uid + ']].' + Twinkle.getPref('summaryAd') );
				aivPage.setAppendText( '\n*{{' + ( Morebits.isIPAddress( uid ) ? 'IPvandal' : 'vandal' ) + '|' + (/\=/.test( uid ) ? '1=' : '' ) + uid + '}} &ndash; ' + reason );
				aivPage.append();
			} );
			break;
	}
};
