{
    "apiVersion": "0.2",
    "swaggerVersion": "1.1",
    "basePath": "http://{{request.host}}/api/v2",
    "apis": [
        {
            "path": "/prescriptioncomparison",
            "description": "Open Prescribing Comparison prescription data",
            "operations": [
                {
                    "httpMethod": "GET",
                    "summary": "Retrieve comparisond prescription data.",
                    "responseClass": "string",
                    "nickname": "drugComparison",
                    "parameters": [
                        {
                            "name": "query_type",
                            "description": "The name granularity of your data",
                            "paramType": "query",
                            "required": true,
                            "allowMultiple": false,
                            "dataType": "string",
                            "enum": [
                                "ccg",
                                "practice"
                            ]
                        },
                        {
                            "name": "group1",
                            "description": "Comma separated list of BNF codes for bucket 1",
                            "paramType": "query",
                            "required": true,
                            "allowMultiple": false,
                            "dataType": "string"
                        },
                        {
                            "name": "group2",
                            "description": "Comma separated list of BNF codes for bucket 2",
                            "paramType": "query",
                            "required": true,
                            "allowMultiple": false,
                            "dataType": "string"
                        }

                    ]
                }
            ]
        }
    ]
}
