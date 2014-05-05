<?php
	
	// import utils
		require_once('utils.php');

	// required vars
		$product_table = DB_PRODUCT_TABLE;
		$product_altname_table = DB_PRODUCT_ALTNAME_TABLE;
		$product_manufacturer_table = DB_PRODUCT_MANUFACTURER_TABLE;

	// check for database 
	// @: create if necessary 
		if(!db_exists( DB_NAME )){ 
			
			$create_db = create_db( DB_NAME );

			if (!$create_db){ echo "DB '" . DB_NAME . "' CREATION QUERY FAILED <br />"; } 
			else { echo "DB '" . DB_NAME . "' CREATED <br />"; }
		}

		else { echo "DB '" . DB_NAME . "' ALREADY EXISTS <br />"; }

	// product table
		$create_product_table = create_table(
			$product_table, 
			"(
				Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,					
				Name varchar(250) NOT NULL,
				ManufacturerId varchar(250) NOT NULL
			)"
		);

		echo $create_product_table["msg"] . "<br />";
		
	// altname table
		$create_altname_table = create_table( 
			
			$product_altname_table, 
			"(
				ProductId varchar(250) NOT NULL,					
				AltName varchar(250) NOT NULL
			)"
		);

		echo $create_altname_table["msg"] . "<br />";
		
	// manufacturer table
		$create_manufacturer_table = create_table( 
			
			$product_manufacturer_table, 
			"(
				Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,					
				Name varchar(250) NOT NULL
			)"
		);

		echo $create_manufacturer_table["msg"] . "<br />";

		mysql_close();
?>