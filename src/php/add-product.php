<?php

	if(!$_POST || !$_POST['product']){ die("I DIDN'T GET ANY PRODUCT METADATA"); }

	require_once('utils.php');

	// required vars
		$connection = db_server_connect();
		$database = mysql_select_db(DB_NAME, $connection);
		$product_metadata = json_decode( $_POST['product'] );

	$transaction = add_product( $product_metadata->name, $product_metadata->manufacturer );
	
	var_dump($transaction);
?>