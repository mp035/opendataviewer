# Open Data Viewer
This repository hosts an aplication for viewing the data recorded by electrical data loggers.

## How to build (Tested on Ubuntu 16.04LTS)

First make sure you have the dependencies installed.

**For the CLI** you need:
* libusb1.0-dev
* scons (for building)

**For the GUI** you need:
* nodejs
* npm

```
sudo apt install npm libusb-1.0-0-dev scons
cd #to whatever folder you want to unpack in
git clone git@github.com:mp035/hantek-365.git
cd opendataviewer
sudo ./install
```
Then run 'opendataviewer' to start.

