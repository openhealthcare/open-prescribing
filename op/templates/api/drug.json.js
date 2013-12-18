{
    "apiVersion": "0.2",
    "swaggerVersion": "1.1",
    "basePath": "http://{{request.host}}/api/v2",
    "apis": [
        {
            "path": "/drug",
            "description": "Open Prescribing Drugs",
            "operations": [
                {
                    "httpMethod": "GET",
                    "summary": "Search for drugs by name",
                    "responseClass": "string",
                    "nickname": "drugName",
                    "parameters": [
                        {
                            "name": "name__icontains",
                            "description": "The name of the drug",
                            "paramType": "query",
                            "required": true,
                            "allowMultiple": false,
                            "dataType": "string"
                        },
                        {
                            "name": "limit",
                            "description": "Limit of how many responses you would like",
                            "paramType": "query",
                            "required": true,
                            "allowMultiple": false,
                            "dataType": "string"
                        }

                    ],
                    "errorResponses": [
                        {
                            "code": 404,
                            "reason": "No matching drugs found"
                        }
                    ]
                }
            ]
        },
        {
            "path": "/drug/{code}",
            "description": "Open Prescribing Drug detail",
            "operations": [
                {
                    "httpMethod": "GET",
                    "summary": "Retrieve a drug by BNF code",
                    "responseClass": "string",
                    "nickname": "drugCode",
                    "parameters": [
                        {
                            "name": "code",
                            "description": "The BNF Code of the drug",
                            "paramType": "path",
                            "required": true,
                            "allowMultiple": false,
                            "dataType": "string"
                        }
                    ],
                    "errorResponses": [
                        {
                            "code": 404,
                            "reason": "No matching drugs found"
                        }
                    ]
                }
            ]
        }

    ]
}
