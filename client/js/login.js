function required()
{
    var fname = document.forms["form1"]["fname"].value;
    var password = document.forms["form1"]["password"].value;

    if (fname === "")
    {
        alert("Insérez votre nom d'utilisateur");
        return false;
    }
    else if (password === "")
    {
        alert("Inrérez votre mot de passe");
        return false;
    }
}
