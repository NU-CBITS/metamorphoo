metamorphoo
===========

# What Is It?

* Latin for "metamorphosis".
* Is a multi-process Node.js app.
* Best known (starting late 2012) and most often used to run the half of Purple Robot Importer process that performs the JSON \0x2192 SQL conversion. The other half is found in [Trireme](https://github.com/cbitstech/trireme), specifically code pertaining to the Dingo module ([controller](https://github.com/cbitstech/trireme/blob/master/controllers/dingo_controller.js)).
* Original (circa mid-2012) purpose was to transform data: A \0x2192 f(A) \0x2192 B.
* Originally (circa mid-2012) intended to also provide web services to handle backend business logic, but not data access. Data access was to be handled by [Trireme](https://github.com/cbitstech/trireme).
* Something of a grab-bag of functionality developed by CBITS for various projects. Again, you're probably here for Purple Robot Importer.

Introduction aside, let's take typical concerns in reverse order:


# How Do I Get Started?

Note: "absolute folder path FolderA" could take any form as a valid path on Linux, e.g. "/home/estory/dev", or "/www", etc..

What we'll do below is configure two instances of Metamorphoo: one for HTTP calls, and one for HTTPS. Neither depends on the other, so feel free to only start one.

0. Ensure you have satisfied the following dependencies:
  0. You are running Linux.
  1. [Node.js](http://nodejs.org/download/) is installed system-wide/globally. Metamorphoo known to run using [v0.10.12](http://nodejs.org/dist/v0.10.12/).
  2. [Trireme](https://github.com/cbitstech/trireme) is installed and running.
    * NOTE: For legacy reasons, [MongoDB](http://www.mongodb.org/downloads) must be installed and running, since Trireme will not start without it.
  2. [Forever](https://github.com/nodejitsu/forever) is installed system-wide/globally.
  3. [Purple Robot Notification Manager (PRNM)](https://github.com/cbitstech/purple_robot_notification_manager/blob/master/PurpleRobotNotificationManager/PurpleRobotNotificationManager.js) exists (optional but recommended). Referenced in the configuration below. Unless you're using Metamorphoo to generate Purple Robot configuration files for use by PRNM, you don't need this. But the variable referencing this *must* be defined in the config file, and if you wish to supply a reference to the actual file necessary, this is what you need.
  4. [Postgres](http://www.postgresql.org/download/) 9.2 or greater is installed and running and can successfully be queried from the host on which Trireme is installed. (Metamorphoo may work with older versions, e.g. 8.x, but this has not been tested.)
1. Into some absolute folder path FolderA, download or clone this repo. Your folder structure should then be FolderA/metamorphoo.
2. Into some absolute folder path FolderA, download or clone Trireme. Your folder structure should then be FolderA/trireme.
3. Into some absolute folder path FolderA, create a folder "configs".
4. Create the file: FolderA/configs/trireme.json, like this:
  
  ```
  {
    "dev":
    {
            "comment": "Trireme Development environment",
            "friendlyName": "Development",
            "log4js": {
                    "cfgFilePath": "./configs/log4js.cfg.json"
            },
            "mongo":
            {
                    "connection":
                    {
                            "hostName": "YOUR MONGODB HOSTNAME",
                            "databaseName": "trireme-dev",
                            "port": YOUR MONGODB PORT (typically 27017),
                            "userName": "YOUR MONGODB USERNAME",
                            "password": "YOUR MONGODB PASSWORD",
                            "error":
                            {
                                    "message": "Internal Error Connecting to Trireme-Dev DB"
                            },
                            "shardHostIPs": []
                    }
            },
            "node":
            {
              "loadBalancingHostIPs": [],
              "port": "3337",
              "ssl": {
                "enabled": true,
                "ca": "YOUR SSL CA FILE PATH",
                "key": "YOUR SSL PRIVATE KEY FILE PATH",
                "cert": "YOUR SSL CERTIFICATE FILE PATH"
              }
            },
            "logging": {
              "outputFile": "logs/trireme.log",
              "maxLogLevel": 4,
              "maxLogSize": 100000000,
              "maxLogFileCount": 20
            },
            "dingo": {
              "host": "YOUR POSTGRES HOSTNAME",
              "port": "YOUR POSTGRES PORT (typically YOUR POSTGRES PORT (typically 5432))",
              "dbmsName": "postgres",
              "dbName": "postgres",
              "userName": "YOUR POSTGRES USERNAME",
              "userPasswd": "YOUR POSTGRES PASSWORD"
            }
    }
  }
  ```
5. Create the file: FolderA/configs/metamorphoo.json, like this:
  
  ```
  {
    "_commentDev": "Metamorphoo, HTTP dev instance",
    "dev_http": {
      "log4js": {
        "cfgFilePath": "FolderA/metamorphoo/log4js.dev_http.cfg.json"
      },
      "friendlyName": "Development",
      "writePrCfgFile": {
        "PurpleRobotNotificationManagerScriptPath": "FolderA/purple_medication/PurpleRobotNotificationManager/PurpleRobotNotificationManager.js"
      },
      "MetamorphooModules": {
        "DocumentManagement": {
          "docList": {
            "path": "URL TO A GOOGLE SPREADSHEET EXTRACT",
            "user": "GMAIL ADDRESS TO A GOOGLE SPREADSHEET TO EXTRACT",
            "password": "PASSWORD TO THE GMAIL ACCOUNT",
            "accessControlList": {
              "AccessGroup1": ["AccessGroup1"],
              "AccessGroup2": ["AccessGroup1", "AccessGroup2"]
            }
          },
          "peopleList": {
            "path": "URL TO A GOOGLE SPREADSHEET EXTRACT",
            "user": "GMAIL ADDRESS TO A GOOGLE SPREADSHEET TO EXTRACT",
            "password": "PASSWORD TO THE GMAIL ACCOUNT",
            "visibleCategories": [ "Category1", "Category2", "Category3"]
          }
        },
        "PrImporter": {
          "database": {
            "owner": "postgres"
          },
          "filePaths": {
            "logSrcPrefix": "PrImporter"
          },
          "network": {
            "webRequestTTL": 3600000
          },
          "dingoPostObj": {
            "host": "YOUR POSTGRES HOSTNAME",
            "port": "YOUR POSTGRES PORT (typically 5432)",
            "dbmsName": "postgres",
            "dbName": "postgres",
            "username": "YOUR POSTGRES USERNAME",
            "user_pw": "YOUR POSTGRES PASSWORD"
          },
          "dingoRequestParams": {
            "host": "YOUR TRIREME HOSTNAME (likely localhost)",
            "port": YOUR TRIREME PORT (likely 3337),
            "path": "/dingo",
            "method": "POST",
            "headers": {
              "Content-Type": "application/x-www-form-urlencoded",
              "Content-Length": -1
            }
          }
        }
      },
      "node": {
        "loadBalancingHostIPs": [],
        "port": "80",
        "ssl": {
          "enabled": false,
          "ca": "ssl/",
          "key": "ssl/",
          "cert": "ssl/",
          "passphrase": ""
        }
      },
      "trireme": {
        "hostName": "YOUR TRIREME HOSTNAME (likely localhost)",
        "port": "YOUR TRIREME PORT (likely 3337)"
      }
    },


    "_commentDev": "Metamorphoo, HTTPS dev instance",
    "dev_https": {
      "log4js": {
        "cfgFilePath": "FolderA/metamorphoo/log4js.dev_https.cfg.json"
      },
      "friendlyName": "Development",
      "writePrCfgFile": {
        "PurpleRobotNotificationManagerScriptPath": "FolderA/purple_medication/PurpleRobotNotificationManager/PurpleRobotNotificationManager.js"
      },
      "MetamorphooModules": {
        "DocumentManagement": {
          "docList": {
            "path": "URL TO A GOOGLE SPREADSHEET EXTRACT",
            "user": "GMAIL ADDRESS TO A GOOGLE SPREADSHEET TO EXTRACT",
            "password": "PASSWORD TO THE GMAIL ACCOUNT",
            "accessControlList": {
              "AccessGroup1": ["AccessGroup1"],
              "AccessGroup2": ["AccessGroup1", "AccessGroup2"]
            }
          },
          "peopleList": {
            "path": "URL TO A GOOGLE SPREADSHEET EXTRACT",
            "user": "GMAIL ADDRESS TO A GOOGLE SPREADSHEET TO EXTRACT",
            "password": "PASSWORD TO THE GMAIL ACCOUNT",
            "visibleCategories": [ "Category1", "Category2", "Category3"]
          }
        },
        "PrImporter": {
          "database": {
            "owner": "postgres"
          },
          "filePaths": {
            "logSrcPrefix": "PrImporter"
          },
          "network": {
            "webRequestTTL": 3600000
          },
          "dingoPostObj": {
            "host": "YOUR POSTGRES HOSTNAME",
            "port": "YOUR POSTGRES PORT (typically 5432)",
            "dbmsName": "postgres",
            "dbName": "postgres",
            "username": "YOUR POSTGRES USERNAME",
            "user_pw": "YOUR POSTGRES PASSWORD"
          },
          "dingoRequestParams": {
            "host": "localhost",
            "port": 3337,
            "path": "/dingo",
            "method": "POST",
            "headers": {
              "Content-Type": "application/x-www-form-urlencoded",
              "Content-Length": -1
            }
          }
        }
      },
      "node": {
        "loadBalancingHostIPs": [],
        "port": "443",
        "ssl": {
          "enabled": true,
          "ca": "YOUR SSL CA FILE PATH",
          "key": "YOUR SSL PRIVATE KEY FILE PATH",
          "cert": "YOUR SSL CERTIFICATE FILE PATH",
          "passphrase": "YOUR SSL PASSPHRASE"
        }
      },
      "trireme": {
        "hostName": "YOUR TRIREME HOSTNAME (likely localhost)",
        "port": "YOUR TRIREME PORT (likely 3337)"
      }
    }
  }
  ```
6. Edit the log4js files at FolderA/metamorphoo/log4js.dev_http.cfg.json and FolderA/metamorphoo/log4js.dev_https.cfg.json. These configure the upper limits of the logging performed by Metamorphoo, for each instance (HTTP and HTTPS). In the configuration below, each instance is allocated a maximum of 100MB per log file * 20 files = 2GB of logs. Since there will be 2 instances of Metamorphoo running (one each for HTTP and HTTPS), this amounts to 4GB of logs. Adjust accordingly. For the HTTP instance:
  
  ```
  {
    "appenders": [
      {
        "type": "file",
        "filename": "FolderA/metamorphoo/logs/metamorphoo.dev_http.log",
        "maxLogSize": 102400000,
        "backups": 20
      }
    ]
  }
  ```
7. Into folder FolderA, save a Bash script like this one as e.g. "restartMetamorphooAndTrireme.bash":
  
  ```bash
  #!/bin/bash

  ROOT="FolderA"

  echo "*** Killing apps ***"
  killall node
  killall forever

  echo "*** Starting apps ***"
  cd $ROOT/trireme && nohup node $ROOT/trireme/trireme.js $ROOT/configs/trireme.json dev 2>&1 > /dev/null &
  cd $ROOT

  forever start $ROOT/metamorphoo/launch.forever.js $ROOT/configs/metamorphoo.json dev_https $ROOT/metamorphoo
  forever start $ROOT/metamorphoo/launch.forever.js $ROOT/configs/metamorphoo.json dev_http $ROOT/metamorphoo
  ```
8. Run restartMetamorphooAndTrireme.bash with no parameters. If all is well, you should receive a heartbeat page for Metamorphoo and Trireme, each, for each port on which they are run (Metamorphoo running on ports 80 and 443, above).


# Purple Robot Importer (PRI)? What Is That and Why Should I Care?

PRI is the JSON-to-SQL transformation layer used in data collection backend at CBITS. Conceptually, it is a purpose-specific object-relational mapper designed to take arbitrary data of unknown structure, and store it in a SQL-based RDBMS. A lengthier description can be found [here](http://tech.cbits.northwestern.edu/2013/10/04/purple-robot-importer-purple-robot-warehouse/).

There are (at least) two available clients to PRI:

1. [Purple Robot](https://github.com/cbitstech/Purple-Robot) - A background-running, context-sensing Android application.
2. [Purple Robot Client](https://github.com/cbitstech/PurpleRobotClient) - A Javascript library enabling JS apps to submit data (such as form responses) to PRI.

As input: PRI takes an payload conforming to a minimal spec, which is otherwise arbitrary in its contents.

As output: PRI produces a set of INSERT statements to a SQL database. CBITS uses PRI in combination with Postgres RDBMS instances.


# Why Should I Be Interested?

Chances are you're here for the Purple Robot Importer functionality.

If you need something else from this project, you probably work for [CBITS](http://cbits.northwestern.edu), where Metamorphoo was created.
