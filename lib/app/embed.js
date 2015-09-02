;!function(base, id){
	'use strict';

	var script = document.getElementById(id);
	var iframe = document.createElement('iframe');
	iframe.style.width = '100%';
	iframe.style.height = '400px';
	iframe.setAttribute('frameborder', '0');
	iframe.src = '//' + base + '#/embed';
	script.parentElement.insertBefore(iframe, script);
}