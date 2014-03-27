<?php
	
	// No Content Header
		header('HTTP/1.0 204 No Response', true, 204);

	// Don't Cache Server-Check
		header( 'Cache-Control: no-store, no-cache, must-revalidate' );
		header( 'Access-Control-Allow-Origin: *' ); 
		header( 'Pragma: no-cache' ); 
?>