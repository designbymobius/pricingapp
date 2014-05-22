<?php
	
	// import utils
		require_once('utils.php');

	// required vars
		$product_table = DB_PRODUCT_TABLE;
		$product_alias_table = DB_PRODUCT_ALIAS_TABLE;
		$product_manufacturer_table = DB_MANUFACTURER_TABLE;
		$product_price_table = DB_PRODUCT_PRICE_TABLE;

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
				ManufacturerId varchar(250) NOT NULL,
				DisplayAliasId varchar(250),
				Price varchar (250)
			)"
		);

		echo $create_product_table["msg"] . "<br />";
		
	// product alias table
		$create_alias_table = create_table( 
			
			$product_alias_table, 
			"(
				Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,					
				ProductId varchar(250) NOT NULL,					
				Alias varchar(250) NOT NULL
			)"
		);

		echo $create_alias_table["msg"] . "<br />";
		
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