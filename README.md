#stub#

*small example:*

    // in some html
    
    <script src="jinq.js"></script>
    <script src="jinq.jquery-adapter.js"></script>
    
    // jinq.jquery-adapter.js - it is necessary for ajax requests, at this moment it has only one implemenetation with jQuery

    var collection = [33, 32, 54, 532, 2421, 553, 5335];
	
	var filteredCollection = jinq(collection).where(function (e) { return e > 50; })
	    .orderbydesc(function (e) { return e; })
	    .take(3)
	    .get();
	    
	for (var i = 0, length = filteredCollection.length; i < length; i++) {
	    console.log(filteredCollection[i]);
	}

    // or

    var filteredCollection = jinq(collection).where(function (e) { return e > 50; })
	    .orderbydesc(function (e) { return e; })
	    .take(3)
        .each(function (e) {
            console.log(e);
        })


*more examples:*

    var students = 
                [
                    { "name" : "joe", "age" : 20, "studinfo" : { "group" : "xx101", "id" : "12345", "avg_mark" : 4.51 } },
                    { "name" : "mike", "age" : 18, "studinfo" : { "group" : "xx301", "id" : "22345", "avg_mark" : 4.71 } },
                    { "name" : "tom", "age" : 18, "studinfo" : { "group" : "xx501", "id" : "32345", "avg_mark" : 4.21 } },
                    { "name" : "piter", "age" : 19, "studinfo" : { "group" : "xx201", "id" : "42345", "avg_mark" : 4.54 } },
                    { "name" : "walter", "age" : 21, "studinfo" : { "group" : "xx001", "id" : "52345", "avg_mark" : 4.22 } }
                ];

    var result = jinq(students)
                    .where(function() { return this.age > 18; })
                    .orderby(function() { return this.studinfo.avg_mark; })
                    .select(function() { return { "name": this.name, "test": this.age }; })
                    .get();
