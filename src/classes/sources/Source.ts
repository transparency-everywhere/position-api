import fetch from 'node-fetch'


class Source{
    fetch = async function(url:String,headers:Object,method:String){
        try {
            const response = await fetch(url, {
            "headers": headers,
            "body": null,
            "method": method
            });
            
            
            const data = await response.json();
            
            return data;
        } catch (error) {
            throw error
        }
    }
}

export default Source;