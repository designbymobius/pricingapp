<?php
	
	header('Access-Control-Allow-Origin: *'); 
	require_once('utils.php');

	// required variables

		$manufacturer_db = array();
		$connection = db_server_connect();
		$database = mysql_select_db(DB_NAME, $connection);

		$get_manufacturer_querystring = "SELECT * FROM " . DB_MANUFACTURER_TABLE;

		$get_manufacturer_query = mysql_query( $get_manufacturer_querystring );


		while($result = mysql_fetch_assoc($get_manufacturer_query)){
			
			array_push($manufacturer_db, $result);
		}

		echo json_encode($manufacturer_db);
?>