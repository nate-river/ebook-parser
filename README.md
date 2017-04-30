# ebook-parser

## use

```javascript
const parser = require('ebook-parser');
parser('./example.epub', function(result) {
    console.log(result)
});
```
output:

```json
{
  "name":"西游记",
  "pic":null,
  "categories":[
    {"id":1,"pid":0,"name":"第一部分","index":"part0000_split_001.html"}
  ],
  "contents":[
    {
    "index":"part0000_split_001.html",
    "content":"Guild. We will our ......"
    }
  ]
}
```


