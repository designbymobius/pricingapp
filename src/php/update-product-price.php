<?php
	
	// filter incomplete requests
		if(!$_POST || !$_POST['id']){ 

			die('PRODUCT ID NOT RECEIVED');
		}

		else if (!$_POST['price']){

			die('PRODUCT PRICE NOT RECEIVED');
		}

	// required variables		
		require_once('utils.php');
		$connection = db_server_connect();
		$database = mysql_select_db(DB_NAME, $connection);

		$update_price_querystring = "UPDATE `" . DB_PRODUCT_TABLE . "` SET `Price` = '" . $_POST['price'] . "' WHERE `Id` = " . $_POST['id'];

		$update_price_query = mysql_query( $update_price_querystring );
?>