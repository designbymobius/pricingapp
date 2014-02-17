module.exports = function(grunt){
	
		grunt.initConfig({

			// req vars
				pkg: grunt.file.readJSON('package.json'),

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

				php: {
					files: [
						{ expand: true, flatten: true, src: ['<%= srcDirectory %>/php/*.php'], dest: '<%= debugDirectory %>/'},
						{ expand: true, flatten: true, src: ['<%= srcDirectory %>/php/*.php'], dest: '<%= buildDirectory %>/'},
						{ expand: true, flatten: true, src: ['<%= srcDirectory %>/php/*.php'], dest: '<%= prodDirectory %>/'}
					]
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
					tasks: 'newer:copy:php'
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

	    	notify_hooks: {
				
				options: {
					enabled: true,
					max_jshint_notifications: 5, // maximum number of notifications from jshint output
				}
			},

			notify: {
				
				ready: {
					options: {
						title: 'Build Ready!', 
						message: 'All files are have been updated',
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
		grunt.registerTask('updateJS', ['newer:jshint:beforeconcat', 'htmlbuild:debug', 'manifest', 'uglify', 'htmlbuild:production', 'copy:manifest', 'notify:ready']);
		grunt.registerTask('updateCSS', ['cssmin', 'htmlbuild', 'manifest', 'copy:manifest', 'notify:ready']);
		grunt.registerTask('updateHTML', ['htmlbuild', 'manifest', 'copy:manifest', 'notify:ready']);
	
	// Growl Notify Settings Update
		grunt.task.run('notify_hooks');	
}