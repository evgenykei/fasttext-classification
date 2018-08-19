function parseQuery(query) {
    let params = {};
    for (let entry of new URLSearchParams(query).entries()) 
        params[entry[0]] = entry[1];
    return params;
}

function reloadWithParams(params) {
    window.location.replace("?" + $.param(params), "_self")
}

function search(query) {
    let text = $('#search').val();
    if (!text) return;

    let params = parseQuery(query);
    params.search = text;
    reloadWithParams(params);
}

function clearSearch(query) {
    let params = parseQuery(query);
    delete params.search;
    reloadWithParams(params);
}

function sort(query, field) {
    let params = parseQuery(query);
    if (params.sort === field) {
        if (!params.asc) params.asc = '1';
        else if (params.asc === '1') params.asc = '-1'
        else if (params.asc === '-1') {
            delete params.sort;
            delete params.asc;
        }
        else return;
    }
    else {
        params.sort = field;
        params.asc = '1';
    }
    reloadWithParams(params);
}

//events

var selectedRow;
$(document).ready(function() {
    const selectedRowClass = 'bg-warning';

    $('#defTable tbody tr').click(function(e) {
        if (selectedRow !== e.currentTarget.id) {
            $('#' + selectedRow).removeClass(selectedRowClass);
            selectedRow = e.currentTarget.id;
            $('#' + selectedRow).addClass(selectedRowClass);
        }
        else {
            $('#' + selectedRow).removeClass(selectedRowClass);
            selectedRow = null;
        }
    });

    $("#newModalShow").click(function(event){
        $("#modal").find('.modal-title').text('Create new entry');
        $("#modal").find('.modal-submit').text('Create');
        $("#modal").find('#modalForm').attr('action', '/create');
        $("#modal").find('#modal-field-id').val('');
        $("#modal").find('#modal-field-class').val('');
        $("#modal").find('#modal-field-text').val('');
        $("#modal").find('#modal-field-checked-false').attr('checked', '');
        $("#modal").find('#modal-field-checked-true').removeAttr('checked');

        $("#modal").modal({ backdrop: 'static', keyboard: false });
    });

    $("#editModalShow").click(function(event){
        if (!selectedRow) return event.stopPropagation();

        let fields = $('#' + selectedRow).children().toArray().map((child) => $(child).text());

        $("#modal").find('.modal-title').text('Edit entry');
        $("#modal").find('.modal-submit').text('Save');
        $("#modal").find('#modalForm').attr('action', '/edit');        
        $("#modal").find('#modal-field-id').val(selectedRow.replace('row', ''));
        $("#modal").find('#modal-field-class').val(fields[0]);
        $("#modal").find('#modal-field-text').val(fields[1]);
        if (fields[2] === 'true') {
            $("#modal").find('#modal-field-checked-false').removeAttr('checked');
            $("#modal").find('#modal-field-checked-true').attr('checked', '');
        }
        else if (fields[2] === 'false') {
            $("#modal").find('#modal-field-checked-false').attr('checked', '');
            $("#modal").find('#modal-field-checked-true').removeAttr('checked');
        }

        $("#modal").modal({ backdrop: 'static', keyboard: false });
    });

    $("#removeElement").click(function(event){
        if (!selectedRow) return event.stopPropagation();

        $("#modal").find('#modalForm').attr('action', '/remove');        
        $("#modal").find('#modal-field-id').val(selectedRow.replace('row', ''));
        $("#modalForm").submit();
    });

    $('#search').keypress(function(event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') $('#searchButton').click();
    });

});