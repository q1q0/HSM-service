
# API HSM



## Indices

* [Default](#default)
  * [Generate](#1-generate)
  * [Sign](#2-sign)


--------


## Default

### 1. Generate


***Endpoint:***

```bash
Method: POST
URL: /generate
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | application/json |  |



***Body:***

```js        
{}
```


***Responses:***


Status: Generate | Code: 200



```js
{
    "ecPoint": "043e1b9184f9f5a5bc3804e8b56a40abe5d20dffb89ea5f1602e2971cfde2667126aaf6611e366cc7dde66f4b980dd72e7e57e6cb620886377b59fbcc117d4162c"
}
```


### 2. Sign


***Endpoint:***

```bash
Method: POST
URL: /sign
```


***Headers:***

| Key | Value | Description |
| --- | ------|-------------|
| Content-Type | application/json |  |



***Body:***

```js        
{
    "ecPoint": "<ecPoint-prev.-generated>",
    "message": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a"
}
```



***Responses:***


Status: Sign | Code: 200



```js
{
    "r": "d1baf24029a4bf229a79c74b57c30178a3384c7af6be3e6bc15fbddc3e7843f2",
    "s": "29e82d4f1b300398d4895e6754b46ce7b331632cecb3ec1f166829b8c06249c6"
}
```

---
[Back to top](#api-hsm)