# ebook-parser

## use

```javascript
const fs = require('fs');
const parser = require('ebook-parser');
parser('./example.epub', function(err,result) {
  if(err){
    console.log(err.message);
  }else{
    console.log(result)
  }
});
```
output:

```json
{
  "name":"西游记",
  "pic":null,
  "categories":[

  ],
  "contents":[
    {
    "id":"id00961",
    "content":"Guild. We will our ......"
    },
    {
    "id":"id00962",
    "content":"Rosin. The single......"
    }
  ]
}
```


