<?php
	
	require_once('utils.php');

	// required variables

		$product_db = array();
		$connection = db_server_connect();
		$database = mysql_select_db(DB_NAME, $connection);

		$get_product_querystring = "SELECT * FROM " . DB_PRODUCT_TABLE;

		$get_product_query = mysql_query( $get_product_querystring );

		while($result = mysql_fetch_assoc($get_product_query)){
			
			array_push($product_db, $result);
		}

		foreach ($product_db as $index => $product) {
			
			$get_product_alias_querystring = "SELECT `Alias` FROM " . DB_PRODUCT_ALIAS_TABLE . " WHERE `Id` = " . $product['DisplayAliasId'];

			$get_product_alias_query = mysql_query($get_product_alias_querystring);

			while($row = mysql_fetch_assoc($get_product_alias_query)){

				$product_db[$index]['Name'] = $row['Alias'];
				unset( $product_db[$index]['DisplayAliasId'] );
			}
		}

		echo json_encode($product_db);
?>