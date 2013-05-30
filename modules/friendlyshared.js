//<nowiki>


(function($){


/*
 ****************************************
 *** friendlyshared.js: Shared IP tagging module
 ****************************************
 * Mode of invocation:     Tab ("Shared")
 * Active on:              Existing IP user talk pages
 * Config directives in:   FriendlyConfig
 */

Twinkle.shared = function friendlyshared() {
	if( mw.config.get('wgNamespaceNumber') === 3 && Morebits.isIPAddress(mw.config.get('wgTitle')) ) {
		var username = mw.config.get('wgTitle').split( '/' )[0].replace( /\"/, "\\\""); // only first part before any slashes
		Twinkle.addPortletLink( function(){ Twinkle.shared.callback(username); }, "Shared IP", "friendly-shared", "Shared IP tagging" );
	}
};

Twinkle.shared.callback = function friendlysharedCallback( uid ) {
	var Window = new Morebits.simpleWindow( 600, 400 );
	Window.setTitle( "Shared IP address tagging" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "Twinkle help", "WP:TW/DOC#shared" );

	var form = new Morebits.quickForm( Twinkle.shared.callback.evaluate );

	var div = form.append( { type: 'div', id: 'sharedip-templatelist' } );
	div.append( { type: 'header', label: 'Shared IP address templates' } );
	div.append( { type: 'radio', name: 'shared', list: Twinkle.shared.standardList,
		event: function( e ) {
			Twinkle.shared.callback.change_shared( e );
			e.stopPropagation();
		}
	} );

	var org = form.append( { type:'field', label:'Fill in other details (optional) and click \"Submit\"' } );
	org.append( {
			type: 'input',
			name: 'organization',
			label: 'IP address owner/operator',
			disabled: true,
			tooltip: 'You can optionally enter the name of the organization that owns/operates the IP address.  You can use wikimarkup if necessary.'
		}
	);
	org.append( {
			type: 'input',
			name: 'host',
			label: 'Host name (optional)',
			disabled: true,
			tooltip: 'The host name (for example, proxy.example.com) can be optionally entered here and will be linked by the template.'
		}
	);
	org.append( {
			type: 'input',
			name: 'contact',
			label: 'Contact information (only if requested)',
			disabled: true,
			tooltip: 'You can optionally enter some contact details for the organization.  Use this parameter only if the organization has specifically requested that it be added.  You can use wikimarkup if necessary.'
		}
	);
	
	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	$(result).find('div#sharedip-templatelist').addClass('quickform-scrollbox');
};

Twinkle.shared.standardList = [
	{
		label: '{{SharedIP}}: standard shared IP address template',
		value: 'Shared IP',
		tooltip: 'IP user talk page template that shows helpful information to IP users and those wishing to warn, block or ban them'
	},
	{ 
		label: '{{SchoolIP}}: shared IP address template modified for educational institutions',
		value: 'SchoolIP'
	},
	{
		label: '{{SharedIPCORP}}: shared IP address template modified for businesses',
		value: 'SharedIPCORP'
	},
	{ 
		label: '{{ISP}}: shared IP address template modified for ISP organizations (specifically proxies)',
		value: 'ISP'
	}
];

Twinkle.shared.callback.change_shared = function friendlysharedCallbackChangeShared(e) {
	if( e.target.value === 'Shared IP edu' ) {
		e.target.form.contact.disabled = false;
	} else {
		e.target.form.contact.disabled = true;
	}
	e.target.form.organization.disabled=false;
	e.target.form.host.disabled=false;
};

Twinkle.shared.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters();
		var pageText = pageobj.getPageText();
		var found = false;
		var text = '{{';

		for( var i=0; i < Twinkle.shared.standardList.length; i++ ) {
			var tagRe = new RegExp( '(\\{\\{' + Twinkle.shared.standardList[i].value + '(\\||\\}\\}))', 'im' );
			if( tagRe.exec( pageText ) ) {
				Morebits.status.warn( 'Info', 'Found {{' + Twinkle.shared.standardList[i].value + '}} on the user\'s talk page already...aborting' );
				found = true;
			}
		}

		if( found ) {
			return;
		}

		Morebits.status.info( 'Info', 'Will add the shared IP address template to the top of the user\'s talk page.' );
		text += params.value + '|' + params.organization;
		if( params.value === 'shared IP edu' && params.contact !== '') {
			text += '|' + params.contact;
		}
		if( params.host !== '' ) {
			text += '|host=' + params.host;
		}
		text += '}}\n\n';

		var summaryText = 'Added {{[[Template:' + params.value + '|' + params.value + ']]}} template.';
		pageobj.setPageText(text + pageText);
		pageobj.setEditSummary(summaryText + Twinkle.getPref('summaryAd'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markSharedIPAsMinor'));
		pageobj.setCreateOption('recreate');
		pageobj.save();
	}
};

Twinkle.shared.callback.evaluate = function friendlysharedCallbackEvaluate(e) {
	var shared = e.target.getChecked( 'shared' );
	if( !shared || shared.length <= 0 ) {
		alert( 'You must select a shared IP address template to use!' );
		return;
	}
	
	var value = shared[0];
	
	if( e.target.organization.value === '') {
		alert( 'You must input an organization for the {{' + value + '}} template!' );
		return;
	}
	
	var params = {
		value: value,
		organization: e.target.organization.value,
		host: e.target.host.value,
		contact: e.target.contact.value
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "Tagging complete, reloading talk page in a few seconds";

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "User talk page modification");
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.shared.callbacks.main);
};
})(jQuery);


//</nowiki>
