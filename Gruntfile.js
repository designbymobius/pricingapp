module.exports = function(grunt){
	
		grunt.initConfig({

			// req vars
				pkg: grunt.file.readJSON('package.json'),
				dbcredentials: grunt.file.readJSON('dbcredentials.json'),

				srcDirectory: "src",
				debugDirectory: "debug",
				buildDirectory: "svelte",
				prodDirectory: "prod",

			// array of assets
				libsJS: ['<%= srcDirectory %>/js/lib/*.js'],			
				coreJS: ['<%= srcDirectory %>/js/behavior.js'],
				coreCSS: ['<%= srcDirectory %>/css/base.css'],

		// Configure Plugins

			// jshint
				jshint: {
					options: {

						devel: true,
						browser: true,
						loopfunc: true,
						lastsemic: true
					},

					beforeconcat: '<%= coreJS %>'
				},

			// uglify
				uglify: {
			
					core_scripts: {
						files: {
							'<%= srcDirectory %>/js/min/core.min.js': ['<%= libsJS %>','<%= coreJS %>']
						}
					}
				},

			// cssmin
				cssmin: {
					
					minify: {
						src: '<%= coreCSS %>',
						dest: '<%= srcDirectory %>/css/min/base.min.css'
					}
				},

			// htmlbuild
				htmlbuild: {

			        debug: {
			            src: '<%= srcDirectory %>/index.html', 
			            dest: '<%= debugDirectory %>/index.html',
			            options: {
			                scripts: {
			                    core: ['<%= libsJS %>','<%= coreJS %>'],
			                },
			                styles: {
			                    base: '<%= coreCSS %>',
			                }
			            }
			        },

			        production: {
			            src: '<%= srcDirectory %>/index.html', 
			            dest: '<%= buildDirectory %>/index.html',
			            options: {
			                
			                scripts: {
			                    core: ['<%= libsJS %>', '<%= srcDirectory %>/js/min/core.min.js'],
			                },
			                
			                styles: {
			                    base: '<%= srcDirectory %>/css/min/base.min.css',
			                },
			                
			                collapseWhitespace: true
			            }
			        }
			    },

		// manifest
			manifest: {

				generate: {
					
					options: {
						basePath:"<%= debugDirectory %>/",
						fallback: ["/ index.html"],
						network: ["*", "server-check.php"],	
						preferOnline: true,
				        timestamp: true,
				        verbose: false,
					},				
					src: ['index.html'],
					dest: '<%= debugDirectory %>/manifest.appcache'
				}
			},

		// copy
			copy: {

				manifest: {
				    files: [ 
				    	{ expand: true, flatten: true, src: ['<%= debugDirectory %>/manifest.appcache'], dest: '<%= buildDirectory %>/'},
				    	{ expand: true, flatten: true, src: ['<%= debugDirectory %>/manifest.appcache'], dest: '<%= prodDirectory %>/'}
				    ]
				},


				php_debug:{

					files: [
						{ expand: true, flatten: true, src: ['<%= srcDirectory %>/php/*.php'], dest: '<%= debugDirectory %>/' }
					],

					options:{

						processContent: function(content, path){

							// process template 
								content = grunt.template.process( content );

							return content;
						}
					}
				},

				php_build:{
					
					files: [
						{ expand: true, flatten: true, src: ['<%= srcDirectory %>/php/*.php'], dest: '<%= buildDirectory %>/'},
					],

					options:{

						processContent: function(content, path){

							grunt.config('build-env', 'build');

							return grunt.template.process(content);
						}
					}
				},

				php_prod:{

					files: [
						{ expand: true, flatten: true, src: ['<%= srcDirectory %>/php/*.php'], dest: '<%= prodDirectory %>/'}
					],

					options:{

						processContent: function(content, path){

							grunt.config('build-env', 'prod');

							return grunt.template.process(content);
						}
					}
				},

				htaccess: {
				    files: [ 
				    	{ expand: true, flatten: true, src: ['<%= srcDirectory %>/.htaccess'], dest: '<%= debugDirectory %>/'}, 
				    	{ expand: true, flatten: true, src: ['<%= srcDirectory %>/.htaccess'], dest: '<%= buildDirectory %>/'}, 
				    	{ expand: true, flatten: true, src: ['<%= srcDirectory %>/.htaccess'], dest: '<%= prodDirectory %>/'} 
				    ],
				},
			},

		// watch
			watch: {

				js: {
					
					files: ['<%= libsJS %>','<%= coreJS %>'],
					tasks: 'updateJS'
				},

				css: {

					files: '<%= coreCSS %>',
					tasks: 'updateCSS'
				},

				php: {

					files: '<%= srcDirectory %>/php/*.php',
					tasks: ['newer:copy:php_debug','newer:copy:php_build', 'newer:copy:php_prod','notify:php']
				},

				index: {

					files: '<%= srcDirectory %>/index.html',
					tasks: 'updateHTML'
				},

				gruntfile: {

					files: 'Gruntfile.js'
				},
            
	            htaccess: {
	              
	              files: ['<%= srcDirectory %>/.htaccess'], 
	              tasks: ['copy:htaccess'],
	            }
	        },

	    // growl-notify
			notify: {
				
				html: {
					options: {
						title: 'HTML UPDATED', 
						message: 'Refresh App to View Updated Markup',
					}
				},
				
				css: {
					options: {
						title: 'CSS UPDATED', 
						message: 'Refresh App to See Style Changes',
					}
				},
				
				js: {
					options: {
						title: 'JS UPDATED', 
						message: 'Refresh App to Load Javascript Changes',
					}
				},

				php: {
					options:{
						title: 'PHP UPDATED',
						message: 'Server-Side Scripts are Updated',

					}
				}
			},

		});

	// Load Plugins	
		grunt.loadNpmTasks('grunt-contrib-jshint');
		grunt.loadNpmTasks('grunt-contrib-uglify');
		grunt.loadNpmTasks('grunt-contrib-cssmin'); 
		grunt.loadNpmTasks('grunt-contrib-watch');
		grunt.loadNpmTasks('grunt-contrib-copy');
		grunt.loadNpmTasks('grunt-html-build');
		grunt.loadNpmTasks('grunt-manifest');
		grunt.loadNpmTasks('grunt-notify');
		grunt.loadNpmTasks('grunt-newer');

	// Register Tasks
		grunt.registerTask('updateJS', ['newer:jshint:beforeconcat', 'htmlbuild:debug', 'manifest', 'uglify', 'htmlbuild:production', 'copy:manifest', 'notify:js']);
		grunt.registerTask('updateCSS', ['cssmin', 'htmlbuild', 'manifest', 'copy:manifest', 'notify:css']);
		grunt.registerTask('updateHTML', ['htmlbuild', 'manifest', 'copy:manifest', 'notify:html']);
}