# API.HSM
This is the HSM API which directly interacts with Thales nShield/SoftHSM.

## Requirements
- Node JS v10 and above
- npm
- MySQL, for database

## Dev. Requirements
Following are only required if you are running this repository locally
- softhsm
    - Mac:
    ```sh
        brew install softhsm
        softhsm2-util --init-token --slot 0 --label "tokenTest" --pin 9540 --so-pin 9540
    ```
    The Ubuntu package for SoftHSM2 is not always initializing properly (depending on the Ubuntu version you are running) so you may have to create missing directories etc. If you get an ERROR: Could not initialize the library when running the above there is a directory missing, and a token not initialized.
    
    ```
    sudo mkdir /var/lib/softhsm/tokens
    sudo chmod a+rwx /var/lib/softhsm
    sudo chmod a+rwx /var/lib/softhsm/tokens
    sudo chmod a+rx /etc/softhsm
    sudo chmod a+r /etc/softhsm/*
    ```

## Configuration Instructions
- Specify the default configuration to be selected as either of SoftHSM/Thales NShield Config in __src/Config.ts__.

## Build Instructions
```
    npm install
    npm run compile
    npm run start
```


## API Reference
Check [here](docs/api.md)
