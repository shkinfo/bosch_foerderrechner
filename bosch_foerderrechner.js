function setupFoerderReport() {
  const divID = "heizreport-foerderrechner";
  const foerderreport = document.getElementById(divID);
  if (!foerderreport) {
      console.error(`Förderreport: DIV mit ID '${divID}' nicht gefunden`);
      return;
  }

  //Parameter
  const abgLink = foerderreport.dataset.foerderAgb;
  const dsLink = foerderreport.dataset.foerderDatenschutz;
  const foerderUser = foerderreport.dataset.foerderUser;
  const pageHost = encodeURIComponent(window.location.hostname);


    if (!abgLink) {
        console.error("Förderreport: AGB-Link nicht vorhanden.");
        foerderreport.style.display = "none";
        return;
    }

    if (!dsLink) {
        console.error("Förderreport: Datenschutz-Link nicht vorhanden.");
        foerderreport.style.display = "none";
        return;
    }

    //Farbe in der Form #RRGGBB oder #RGB
    const hexColorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const farbeFG = hexColorPattern.test(foerderreport.dataset.foerderFarbe) ? foerderreport.dataset.foerderFarbe : "#09B850";
    const farbeBG = hexColorPattern.test(foerderreport.dataset.foerderHintergrund) ? foerderreport.dataset.foerderHintergrund : "#fafafa";

    const htmlString = foerderRechnerHTML
        .replaceAll("___FARBE_FG___", farbeFG)
        .replaceAll("___FARBE_BG___", farbeBG)
        .replaceAll("___AGB_LINK___", abgLink)
        .replaceAll("___DS_LINK___", dsLink);

    foerderreport.innerHTML = htmlString;


    foerderreport.querySelectorAll(".foerderBerichtErfolgClose").forEach(selectElm => selectElm.addEventListener("click", () => closeModal("foerderRechner-modal-erfolg")));

    foerderreport.querySelector("#kostenHeizungstechnik").addEventListener("input", e => setKostenHeizungstechnik(foerderreport, Number(e.target.value)));
    foerderreport.querySelector("#rechnerWohneinheitenAnzahl").addEventListener("change", e => setMaximalFoerderung(foerderreport, Number(e.target.value)));

    foerderreport.querySelectorAll("select").forEach(selectElm => selectElm.addEventListener("change", () => aktualisiereFoerderung(foerderreport)));
    foerderreport.querySelectorAll("input").forEach(selectElm => selectElm.addEventListener("input", () => aktualisiereFoerderung(foerderreport)));
    foerderreport.querySelector("#foerderRechner-email").addEventListener("input", () => checkEnableButtonSenden(foerderreport))
    foerderreport.querySelector("#foerderrechnerKontakt").addEventListener("input", () => checkEnableButtonSenden(foerderreport))
    foerderreport.querySelector("#foerderrechnerAGB").addEventListener("input", () => checkEnableButtonSenden(foerderreport))
    foerderreport.querySelector("#rechnerNeueHeizungTyp").addEventListener("change", () => checkEnableOptions(foerderreport))

    foerderreport.querySelector("#switchrechnerKaeltemittel").checked = false;

    setMaximalFoerderung(foerderreport, Number(foerderreport.querySelector("#rechnerWohneinheitenAnzahl").value));
    checkEnableOptions(foerderreport);
    aktualisiereFoerderung(foerderreport);
}

function setKostenHeizungstechnik(foerderreport, kosten) {
    foerderreport.querySelector("#kostenHeizungstechnik").value = kosten;
    foerderreport.querySelector("#kostenHeizungstechnikValue").innerHTML = kosten.toLocaleString(undefined, { minimumFractionDigits: 0 }) + " €";
}

function aktualisiereFoerderung(foerderreport) {
    const foerderReportData = {
        gebaeudetyp: foerderreport.querySelector('#rechnerGebaeudeTyp').value,
        wohneinheitenAnzahl: Number(foerderreport.querySelector('#rechnerWohneinheitenAnzahl')?.value),
        wohneinheitenSelbstGenutzt: foerderreport.querySelector('#rechnerWohneinheitenSelbstGenutzt').value,
        jahreseinkommen: foerderreport.querySelector('#rechnerJahreseinkommen').value,
        alteHeizungTyp: foerderreport.querySelector('#rechnerAltHeizungTyp').value,
        alteHeizungAlter: foerderreport.querySelector('#rechnerAltHeizungAlter').value,
        neueHeizungTyp: foerderreport.querySelector('#rechnerNeueHeizungTyp').value,
        waermeQuelle: foerderreport.querySelector('#rechnerWaermequelle').value,
        natuerlicheKaeltemittel: foerderreport.querySelector('#switchrechnerKaeltemittel').checked,
        emissionsminderung: foerderreport.querySelector('#switchrechnerEmission').checked,
        biomassekombination: foerderreport.querySelector('#switchrechnerBiomasse').checked,
        kostenHeizungstechnik: foerderreport.querySelector('#kostenHeizungstechnik').value
    };

    const ergebnis = berechneFoerderung(foerderReportData);

    foerderreport.querySelector("#foerderGesamtSumme").innerHTML = Number(ergebnis.foerderSummeGesamt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
    foerderreport.querySelector("#foerderAnzahlWohneinheiten").innerHTML = Number(ergebnis.wohneinheitenAnzahl).toLocaleString(undefined, { maximumFractionDigits: 0 });
    foerderreport.querySelector("#foerderBasisfoerderung").setAttribute("data-foerder-enabled", ergebnis.checkBasisfoerderung);
    foerderreport.querySelector("#foerderGeschwindigkeitsbonus").setAttribute("data-foerder-enabled", ergebnis.checkGeschwindigkeitsbonus);
    foerderreport.querySelector("#foerderEinkommensbonus").setAttribute("data-foerder-enabled", ergebnis.checkEinkommensbonus);
    foerderreport.querySelector("#foerderEffizienzbonus").setAttribute("data-foerder-enabled", ergebnis.checkEffizienzbonus);

    return {
        eingaben: foerderReportData,
        ergebnis
    };
}

function berechneFoerderung(frInpt) {
    const foerderReportOutput = {
        foerderSummeGesamt: 0,
        wohneinheitenAnzahl: frInpt.wohneinheitenAnzahl,
        checkBasisfoerderung: false,
        checkGeschwindigkeitsbonus: false,
        checkEinkommensbonus: false,
        checkEffizienzbonus: false
    };

    // Berechtigung für verschiedene Förderansprüche prüfen
    foerderReportOutput.checkBasisfoerderung = getBasisFoerderung(frInpt);
    foerderReportOutput.checkGeschwindigkeitsbonus = getGeschwindigkeitsbonus(frInpt);
    foerderReportOutput.checkEinkommensbonus = getEinkommensbonus(frInpt);
    foerderReportOutput.checkEffizienzbonus = getEffizienzbonus(frInpt);

    ///////////////////////////////////////////////////////
    // Tatsächliche Förderung berechnen
    foerderReportOutput.foerderSummeGesamt = Math.round(getFoerderSumme(frInpt, foerderReportOutput) * 100) / 100;

    return foerderReportOutput;
}

function getBasisFoerderung(frInpt) {
    // Basisförderung gibt es immer
    return true;
}

function getGeschwindigkeitsbonus(frInpt) {
    // in jedem Fall nur, wenn es sich um eine selbstgenutzte Wohneinheit handelt
    if (frInpt.wohneinheitenSelbstGenutzt === 'WOHNGEN_kein') return false;

    //Wenn Biomasse nicht mit etwas kombiniert wird dann gibt es keinen Bonus
    if (frInpt.neueHeizungTyp === 'NEUHEIZ_biomasse' && frInpt.biomassekombination !== true){
      return false;
    }

    //Gasheizung / Gaskessel, wenn älter als 20 Jahre, wird entsorgt
    if (frInpt.alteHeizungTyp === 'HEIZART_gaskessel'
        && frInpt.alteHeizungAlter === 'HEIZALT_gr_20_ents'
        && frInpt.neueHeizungTyp !== 'NEUHEIZ_wp_gas'
        && frInpt.neueHeizungTyp !== 'NEUHEIZ_wp_oel') {
        return true;
    }

    //Öl-, Kohle-, Gas-Etagen-, Nacht­speicher­heizung
    if (
        (frInpt.alteHeizungTyp === 'HEIZART_oelkessel' || frInpt.alteHeizungTyp === 'HEIZART_nachtspeicherheizung' || frInpt.alteHeizungTyp === 'HEIZART_gasetagenheizung')
        && (frInpt.alteHeizungAlter === 'HEIZALT_gr_20_ents' || frInpt.alteHeizungAlter === 'HEIZALT_kl_20_ents')
        && frInpt.neueHeizungTyp !== 'NEUHEIZ_wp_gas'
        && frInpt.neueHeizungTyp !== 'NEUHEIZ_wp_oel') {
        return true;
    }

    return false;
}

function getEinkommensbonus(frInpt) {
    //wenn nicht selbstgenutzt, kein Einkommensbonus
    if (frInpt.wohneinheitenSelbstGenutzt === 'WOHNGEN_kein') return false;

    // Wenn Haushaltseinkommen über 40.000 €, kein Einkommensbonus
    if (frInpt.jahreseinkommen === 'JAHREK_kl_40000') return true;

    return false;
}

function getEffizienzbonus(frInpt) {
    // Liste der Werte
    const erlaubteWerteEffizienz = [
        "NEUHEIZ_waermepumpe",
        "NEUHEIZ_wp_solar",
        "NEUHEIZ_wp_gas",
        "NEUHEIZ_wp_oel",
        "NEUHEIZ_wp_fernw"
    ];

    if(erlaubteWerteEffizienz.includes(frInpt.neueHeizungTyp)){
      // Wenn natürliche Kältemittel oder bei Wasser, Abwasser, Erdreich
      if (frInpt.waermeQuelle !== 'WAERMEQ_luft') {
          //nicht Luft -> Erde oder Grundwasser
          return true;
      }

      if (frInpt.natuerlicheKaeltemittel) {
          //natürliche Kältemittel
          return true;
      }
    }

    return false;
}

function setMaximalFoerderung(foerderreport, anzahlWohneinheiten) {
    const maxFoerdersumme = getMaximalFoerderung(anzahlWohneinheiten);
    foerderreport.querySelector("#kostenHeizungstechnik").max = maxFoerdersumme;
    setKostenHeizungstechnik(foerderreport, maxFoerdersumme);
}

function getMaximalFoerderung(anzahlWohneinheiten) {
    // 30.000 € für die erste Wohneinheit
    let maxFoerdersumme = 30000;
    // 15.000 für die zweite bis sechste Wohneinheit
    if (anzahlWohneinheiten > 1) maxFoerdersumme += (Math.min(anzahlWohneinheiten, 6) - 1) * 15000;
    // 8.000 für jede weitere Wohneinheit
    if (anzahlWohneinheiten > 6) maxFoerdersumme += (anzahlWohneinheiten - 6) * 8000;
    return maxFoerdersumme;
}

function getFoerderSumme(frInpt, frOupt) {
    let kostenHeizungstechnik = frInpt.kostenHeizungstechnik;

    //Wenn es eine Biomasseheizung ist und der Emissionszuschlag gewährt werden soll
    //muss vorher 2.500 € abgezigen werden die später pauschal hinzuaddiert werden
    if (frInpt.neueHeizungTyp === 'NEUHEIZ_biomasse' && frInpt.emissionsminderung === true) kostenHeizungstechnik -= 2500;

    //Wenn eine Hybridanlage dann reduziere hier die maximalen KOsten auf 65 %
    if (frInpt.neueHeizungTyp === 'NEUHEIZ_wp_gas' || frInpt.neueHeizungTyp === 'NEUHEIZ_wp_oel') kostenHeizungstechnik *= 0.65;

    const kostenProWohneinheit = kostenHeizungstechnik / frInpt.wohneinheitenAnzahl;

    let foerderSumme = 0;
    if (frOupt.checkBasisfoerderung) foerderSumme += kostenHeizungstechnik * 0.3;
    if (frOupt.checkEffizienzbonus) foerderSumme += kostenHeizungstechnik * 0.05;
    //Geschwindigkeitsbonus gibt es nur, wenn selbst genutzt, das wurde schon geprüft
    if (frOupt.checkGeschwindigkeitsbonus) foerderSumme += kostenProWohneinheit * 0.2;
    //Einkommensbonus gibt es nur, wenn selbst genutzt, das wurde schon geprüft
    if (frOupt.checkEinkommensbonus) {
        if (frOupt.checkGeschwindigkeitsbonus && !frOupt.checkEffizienzbonus) {
            foerderSumme += kostenProWohneinheit * 0.2;
        }
        else if (frOupt.checkGeschwindigkeitsbonus && frOupt.checkEffizienzbonus) {
            foerderSumme += kostenProWohneinheit * 0.15;
        }
        else foerderSumme += kostenProWohneinheit * 0.3;
    }


    if (frInpt.neueHeizungTyp === 'NEUHEIZ_biomasse' && frInpt.emissionsminderung === true) foerderSumme += 2500;

    return foerderSumme;
}

function checkEnableButtonSenden(foerderreport) {
    const eMailValid = foerderreport.querySelector("#foerderRechner-email").validity.valid;
    const eMailAdresse = foerderreport.querySelector("#foerderRechner-email").value;
    const checkKontakt = foerderreport.querySelector("#foerderrechnerKontakt").checked;
    const checkAGB = foerderreport.querySelector("#foerderrechnerAGB").checked;
    foerderreport.querySelector("#foerderBerichtSendenBtn").disabled = (eMailAdresse === "" || !eMailValid || !checkKontakt || !checkAGB);
}

function checkEnableOptions(foerderreport) {
    const neueHeizungTyp = foerderreport.querySelector('#rechnerNeueHeizungTyp').value;
    const block1 = foerderreport.querySelector("#foerderRechnerAuswahlKaeltemittel");
    const block2 = foerderreport.querySelector("#foerderRechnerAuswahlEmission");
    const block4 = foerderreport.querySelector("#foerderRechnerAuswahlBiomasse");
    const block3 = foerderreport.querySelector("#foerderRechnerAuswahlWaermequelle");

    // Liste der Werte, bei denen Block1 angezeigt wird
    const erlaubteWerteBlock1 = [
        "NEUHEIZ_waermepumpe",
        "NEUHEIZ_wp_solar",
        "NEUHEIZ_wp_gas",
        "NEUHEIZ_wp_oel",
        "NEUHEIZ_wp_fernw"
    ];

    // Bedingung für Block1
    block1.style.display = erlaubteWerteBlock1.includes(neueHeizungTyp) ? "" : "none";
    block3.style.display = erlaubteWerteBlock1.includes(neueHeizungTyp) ? "" : "none";

    // Bedingung für Block2 (nur Biomasse)
    block2.style.display = (neueHeizungTyp === "NEUHEIZ_biomasse") ? "" : "none";
    block4.style.display = (neueHeizungTyp === "NEUHEIZ_biomasse") ? "" : "none";
}


document.addEventListener("DOMContentLoaded", () => {
    console.log("Starte Förderreport");
    setupFoerderReport();
});

const foerderRechnerHTML = `
<style>
    .foerderRechnerContainer {
        width: 100%;
        max-width: 1200px;
        margin: 0px auto;
        padding: 1rem 1rem;
        color: rgb(97, 97, 97);
        position: relative;
        z-index: 900;
    }

    .foerderRechnerCards {
        display: block;
        text-align: center;
    }

    .foerderRechnerContainer .foerderRechner-card {
        margin: 0px auto 1rem auto;
        padding: 0px;
        border-radius: 5px;
        border: 1px solid ___FARBE_FG___;
        background-color: ___FARBE_BG___;
    }

    .foerderRechnerContainer .foerderRechner-card-header {
        font-size: calc(1.363rem + 1.356vw);
        font-family: "Instrument Sans", sans-serif;
        font-weight: 700;
        line-height: 1.25;
        margin: 0px 10px;
        text-align: left;
    }

    .foerderRechnerContainer .foerderRechner-card-body {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-evenly;
        margin: 1rem 0;
    }

    .foerderRechnerContainer .foerderRechner-col {
        flex: 1 1 300px;
        margin: 5px;
    }

    .foerderRechnerContainer .foerderRechner-formElement {
        font-size: 0.5em;
        margin: 20px 10px;
        position: relative;
    }

    .foerderRechnerContainer .foerderRechner-formElement select {
        width: 100%;
        padding: 2.5rem 2.5rem 0.8rem 1.2rem !important;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #FFF;
        color: #333;
        font-size: 1rem;
        appearance: none;
        font-weight: normal;
        height: auto;
        min-height: 4rem;
        background-image: none !important;
    }

    .foerderRechnerContainer .foerderRechner-haustechnik-links {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .foerderRechnerContainer .foerderRechner-haustechnik-rechts {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .foerderRechnerContainer .foerderRechner-formElement select:focus {
        outline: none;
        box-shadow: 0 0.125rem 0.25rem #ccc;
    }

    .foerderRechnerContainer .foerderRechner-formElement:has(select):after {
        content: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23606261' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
        position: absolute;
        right: 10px;
        top: 50%;
        display: block;
        pointer-events: none;
        color: #CCC;
        width: 0.7em;
        height: 0.7em;
        transform: translate(0, -50%);
    }

    .foerderRechnerContainer .foerderRechner-formElement>label:has(+select) {
        position: absolute;
        top: 0;
        left: 0;
        font-size: 0.8rem;
        padding: 0.8em 0.75em;
        font-weight: 300;
        z-index: 2;
        overflow: hidden;
        color: rgb(97, 97, 97);
        pointer-events: none;
    }

    .foerderRechnerContainer .foerderRechner-formElement input[type="checkbox"] {
        width: 3rem;
        min-width: 20px;
        max-width: 40px;
        height: 1.5rem;
        border-radius: 1rem;
        border: 1px solid #DDD;
        background-color: #DDD;
        appearance: none;
        cursor: pointer;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='rgba%280, 0, 0, 0.25%29'/%3e%3c/svg%3e");
        background-position: center left;
        background-repeat: no-repeat;
        transition: background-position 0.5s;
    }

    .foerderRechnerContainer .foerderRechner-formElement input[type="checkbox"]:checked {
        background-position: center right;
        background-color: ___FARBE_FG___;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e");
    }

    .foerderRechnerContainer .foerderRechner-naturKaeltemittel {
        margin: auto;
        margin-left: 0;
        padding-left:10px;
        display: grid;
        grid-template-columns: 25px auto; /* 25px für Checkbox, Rest für Label */
        align-items: center;
        margin-bottom: 8px;
        gap: 8px;
    }

    .foerderRechnerContainer .foerderrechner-checkAGB,
    .foerderRechnerContainer .foerderrechner-checkBeratung {
        display: grid;
        justify-content: start;
        grid-template-columns: max-content 1fr;
        margin: auto;
        margin-left: 0;
        align-items: center;
    }

    .foerderRechnerContainer .foerderRechner-formElement input[type="checkbox"]+label {
        font-size: 1rem;
        font-weight: 300;
        color: rgb(97, 97, 97);
        cursor: pointer;
        padding-left: 1em;
    }

    .foerderRechnerContainer .foerderRechner-heiztechnik-output {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .foerderRechnerContainer .foerderRechner-heiztechnik-output span {
        margin: 0;
    }

    .foerderRechnerContainer .foerderRechner-formElement:has(.foerdeRrechner-kosten-label) {
        text-align: left;
        font-weight: 300;
    }

    .foerderRechnerContainer .foerderRechner-formElement label:has(input[type="range"]) {
        font-size: 1rem;
        margin: auto;
        font-weight: 300;
    }

    .foerderRechnerContainer .foerderRechner-formElement input[type="range"] {
        width: 100%;
        height: 0.6em;
        margin: 1em 0;
        appearance: none;
        background: transparent;
        background-color: #DDD;
        border-radius: 1em;
    }

    .foerderRechnerContainer .foerderRechner-foerderKostenHeiztechnik {
        font-size: 1.5rem;
        margin: auto;
        font-weight: 300;
        color: rgb(97, 97, 97);
        text-align: right;
        border: 0;
        background-color: transparent;
    }

    .foerderRechnerContainer .foerderRechner-infoCard {
        font-size: 0.5em;
        margin: 5px;
        border: 1px solid #ccc;
        border-radius: 5px;
        box-shadow: 0 0.125rem 0.25rem rgba(29, 58, 83, 0.15);
        text-align: center;
        height: 100%;
    }

    .foerderRechnerContainer .foerderRechner-infoCard p {
        color: ___FARBE_FG___;
    }

    .foerderRechnerContainer .foerderRechner-resultRow {
        display: grid;
        gap: 1.0em;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        margin-left: 0.5em;
        margin-right: 0.5em;
    }

    .foerderRechnerContainer .foerderRechner-subRow {
        display: grid;
        gap: 1.0em;
        grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
    }

    .foerderRechnerContainer .foerderRechner-resultCol {
        font-size: 1rem;
        text-align: left;
    }

    .foerderRechnerContainer .foerderRechner-resultCol p {
        font-size: 0.875em;
        font-weight: 400;
    }

    .foerderRechnerContainer .foerderRechner-resultCol strong {
        color: ___FARBE_FG___;
    }

    .foerderRechnerContainer hr {
        margin: 1rem 0;
        color: #85878a;
        border: 0;
        border-top: 1px solid #85878a;
        opacity: 0.25;
    }

    .foerderRechnerContainer .foerderRechner-resultCol h1 {
        font-size: 3.5rem;
        font-weight: 700;
        margin: 0px 0px;
        margin-bottom: 0.25em;
        white-space: nowrap;
    }

    .foerderRechnerContainer h3 {
        color: rgb(97, 97, 97);
        margin: 10px;
        font-size: 1em;
    }

    .foerderRechnerContainer h3 svg {
        width: 2em;
        height: 2em;
        vertical-align: -0.25em;
        fill: ___FARBE_FG___;
        overflow: hidden;
    }

    .foerderRechnerContainer h1 svg {
        width: 1.1em;
        height: 1.1em;
        vertical-align: -0.25em;
        fill: ___FARBE_FG___;
        overflow: hidden;
    }

    .foerderRechnerContainer svg[data-foerder-enabled="false"] {
        display: none;
    }

    .resultCol:has([data-foerder-enabled="false"]) p strong {
        color: #AAA;
    }

    strong {
        font-size: 1.25em;
    }

    .foerderRechnerContainer .foerderRechner-btn {
        margin: auto;
        width: 80%;
        text-align: center;
    }

    .foerderRechnerContainer .foerderRechner-btn button {
        width: 100%;
        padding: 1.25rem;
        border: 0;
        border-radius: 0.4rem;
        background-color: ___FARBE_FG___;
        color: #FFF;
        font-size: clamp(0.75rem, 4.0vw, 1.25rem);
        opacity: 0.8;
        transition: opacity 0.5s;
        white-space: wrap;
    }

    .foerderRechnerContainer .foerderRechner-btn button:hover {
        opacity: 1;
        transition: opacity 0.5s;
    }

    .foerderRechnerContainer .foerderRechner-btn button:disabled {
        opacity: 0.5;
        transition: opacity 0.5s;
    }

    body:has(.foerderRechner-modal-open) {
        overflow: hidden;
    }

    .foerderRechnerContainer .foerderRechner-modal-container {
        display: none;
        z-index: 1020;

        &.foerderRechner-modal-open {
            display: block;
        }

        & .foerderRechner-modal-background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1030;
        }

        & .foerderRechner-modal.foerderRechner-modal {
            --modal-width: 60%;
            --modal-height: 60%;
            --modal-padding-x: 2rem;
            --modal-padding-y: 2rem;
            position: fixed;
            z-index: 1050;
            padding: var(--modal-padding-y) var(--modal-padding-x);
            left: calc((100% - var(--modal-width) - var(--modal-padding-x)) / 2);
            top: calc((100% - var(--modal-height) - var(--modal-padding-y)) / 2);
            width: calc(var(--modal-width) - var(--modal-padding-x));
            overflow: auto;
            background-color: white;
            border: 2px solid ___FARBE_FG___;
            border-radius: 5px;
            max-height: 100%;

            @media (max-width: 750px) {
                --modal-width: 100%;
                --modal-height: 100%;
                --modal-padding-x: 0rem;
                --modal-padding-y: 0rem;
                --modal-content-x: 1rem;
                height: 100%;
                border: none;
                border-radius: 0px;
            }

            & .foerderRechner-modal-header {
                min-height: 5rem;
                border-bottom: 1px solid #ccc;
                margin: 1rem auto;
                position: relative;
                width: calc(100% - 2rem);
                display: grid;
                grid-template-columns: max-content 1fr max-content;
                justify-content: start;

                &.foerder-noborder {
                    border: none;
                    margin-top: 4rem;
                }

                & svg {
                    display: block;
                    width: 3rem;
                    height: 3rem;
                    fill: ___FARBE_FG___;
                    overflow: hidden;
                    margin: 0rem var(--modal-content-x, 0px);
                }

                & .foerderRechner-modal-text {
                    display: block;
                    font-size: min(1.5rem, 6vw);
                    font-family: "Instrument Sans", sans-serif;
                    font-weight: 700;
                    margin: 0px 10px;
                }

                & .foerderRechner-modal-close {
                    color: #aaaaaa;
                    font-size: 4rem;
                    font-family: "Instrument Sans", sans-serif;
                    font-weight: 700;
                    line-height: 0.5;
                    z-index: 5;
                }

                & .foerderRechner-modal-close:hover,
                & .foerderRechner-modal-close:focus {
                    color: #000;
                    text-decoration: none;
                    cursor: pointer;
                }

                &.foerderRechner-modal-erfolg {
                    display: grid;
                    grid-template-columns: auto auto auto;
                }
            }

            & .foerderRechner-modal-content {
                background-color: #fefefe;
                margin: auto var(--modal-content-x, 0px);
                padding: 20px;
                border: 1px solid ___FARBE_FG___;

                &.foerder-noborder {
                    border: none;
                }

                & div {
                    position: relative;
                    overflow: hidden;
                    margin: 1rem 0;
                }

                & .foerderrechner-eMailAdresse input {
                    width: 100%;
                    padding: 1.5rem 10px 10px 10px !important;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    appearance: none;
                    height: 4rem;
                }

                & input:invalid:not(:focus) {
                    background-color: #FFDDDD;
                }

                & input:focus {
                    outline: none;
                    border: 1px solid #AAA;
                }

                & .foerderrechner-eMailAdresse > label {
                    position: absolute;
                    top: 0;
                    left: 0;
                    margin: 5px 10px;
                    font-size: 1rem;
                    font-weight: 300;
                    z-index: 2;
                    overflow: hidden;
                    white-space: nowrap;
                    color: rgb(97, 97, 97);
                    pointer-events: none;
                }

                & .foerderRechner-btn {
                    margin: auto;
                    margin-top: 30px;
                }

                & .foerderRechner-btn:has(.foerderBerichtErfolgClose) {
                    margin: auto;
                    margin-top: 0;
                }
            }
        }
    }
</style>

<div class="foerderRechnerContainer">
    <form>
        <div class="foerderRechnerCards">

            <!-- Gebäudedaten -->
            <div class="foerderRechner-card">
                <div class="foerderRechner-card-header">
                    <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->
                            <path d="M575.8 255.5c0 18-15 32.1-32 32.1l-32 0 .7 160.2c0 2.7-.2 5.4-.5 8.1l0 16.2c0 22.1-17.9 40-40 40l-16 0c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1L416 512l-24 0c-22.1 0-40-17.9-40-40l0-24 0-64c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32 14.3-32 32l0 64 0 24c0 22.1-17.9 40-40 40l-24 0-31.9 0c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2l-16 0c-22.1 0-40-17.9-40-40l0-112c0-.9 0-1.9 .1-2.8l0-69.7-32 0c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z" />
                        </svg>
                        Gebäudedaten
                    </h3>

                    <div class="foerderRechner-card-body">

                        <div class="foerderRechner-col">
                            <div class="foerderRechner-formElement">
                                <label for="antragObjektArt">Gebäudetyp</label>
                                <select id="rechnerGebaeudeTyp">
                                    <option value="GEBTYP_sanWohn">Sanierung Wohngebäude</option>
                                </select>
                            </div>

                            <div class="foerderRechner-formElement">
                                <label for="antragObjektArt">Wohneinheiten</label>
                                <select id="rechnerWohneinheitenAnzahl">
                                    <option value="1">1 Wohneinheit</option>
                                    <option value="2">2 Wohneinheiten</option>
                                    <option value="3">3 Wohneinheiten</option>
                                    <option value="4">4 Wohneinheiten</option>
                                    <option value="5">5 Wohneinheiten</option>
                                    <option value="6">6 Wohneinheiten</option>
                                    <option value="7">7 Wohneinheiten</option>
                                    <option value="8">8 Wohneinheiten</option>
                                    <option value="9">9 Wohneinheiten</option>
                                    <option value="10">10 Wohneinheiten</option>
                                    <option value="11">11 Wohneinheiten</option>
                                    <option value="12">12 Wohneinheiten</option>
                                    <option value="13">13 Wohneinheiten</option>
                                    <option value="14">14 Wohneinheiten</option>
                                </select>
                            </div>

                            <div class="foerderRechner-formElement">
                                <label for="antragObjektArt">davon selbst genutzt</label>
                                <select id="rechnerWohneinheitenSelbstGenutzt">
                                    <option value="WOHNGEN_kein">keine Wohneinheit</option>
                                    <option value="WOHNGEN_min_eins" selected>mind. eine Wohneinheit</option>
                                </select>
                            </div>
                        </div>

                        <div class="foerderRechner-col">
                            <div class="foerderRechner-formElement">
                                <label for="antragObjektArt">Jahreseinkommen</label>
                                <select id="rechnerJahreseinkommen">
                                    <option value="JAHREK_kl_40000">Jahreseinkommen Haushalt bis 40.000€</option>
                                    <option value="JAHREK_gr_40000">Jahreseinkommen Haushalt über 40.000€</option>
                                    <option value="JAHREK_ka">keine Angabe</option>
                                </select>
                            </div>

                            <div class="foerderRechner-formElement">
                                <label for="antragObjektArt">Bestehende Heizung - Typ</label>
                                <select id="rechnerAltHeizungTyp">
                                    <option value="HEIZART_gaskessel">Gaskessel</option>
                                    <option value="HEIZART_gasetagenheizung">Gasetagenheizung</option>
                                    <option value="HEIZART_oelkessel">Ölkessel</option>
                                    <option value="HEIZART_waermepumpe">Wärmepumpe</option>
                                    <option value="HEIZART_nachtspeicherheizung">Nachtspeicherheizung</option>
                                    <option value="HEIZART_elektro_zentral">Elektro-Zentralheizung</option>
                                    <option value="HEIZART_kohleheizung">Kohlheizung</option>
                                    <option value="HEIZART_sonstige">Sonstige Wärmeerzeuger</option>
                                </select>
                            </div>

                            <div class="foerderRechner-formElement">
                                <label for="antragObjektArt">Bestehende Heizung - Alter</label>
                                <select id="rechnerAltHeizungAlter">
                                    <option value="HEIZALT_gr_20_ents">Älter als 20 Jahre - wird entsorgt</option>
                                    <option value="HEIZALT_gr_20_weiter">Älter als 20 Jahre - wird weiter genutzt</option>
                                    <option value="HEIZALT_kl_20_ents">Jünger als 20 Jahre - wird entsorgt</option>
                                    <option value="HEIZALT_kl_20_weiter">Jünger als 20 Jahre - wird weiter genutzt</option>
                                </select>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Haustechnik -->
            <div class="foerderRechner-card">
                <div class="foerderRechner-card-header">
                    <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->
                            <path d="M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM288 96a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM256 416c35.3 0 64-28.7 64-64c0-17.4-6.9-33.1-18.1-44.6L366 161.7c5.3-12.1-.2-26.3-12.3-31.6s-26.3 .2-31.6 12.3L257.9 288c-.6 0-1.3 0-1.9 0c-35.3 0-64 28.7-64 64s28.7 64 64 64zM176 144a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM96 288a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm352-32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
                        </svg>
                        Haustechnik
                    </h3>

                    <div class="foerderRechner-card-body">

                        <div class="foerderRechner-col foerderRechner-haustechnik-links">
                            <div class="foerderRechner-formElement">
                                <label for="antragObjektArt">Neue Heizungsanlage</label>
                                <select id="rechnerNeueHeizungTyp">
                                    <option value="NEUHEIZ_waermepumpe">Wärmepumpe</option>
                                    <option value="NEUHEIZ_wp_solar">Wärmepumpe und Solaranlage</option>
                                    <option value="NEUHEIZ_wp_gas">Wärmepumpe und neuer Gaskessel</option>
                                    <option value="NEUHEIZ_wp_oel">Wärmepumpe und neuer Ölkessel</option>
                                    <option value="NEUHEIZ_wp_fernw">Wärmepumpe und Fernwärme</option>
                                    <option value="NEUHEIZ_biomasse">Biomasseheizung</option>
                                    <option value="NEUHEIZ_solar">Solarthemische Anlage</option>
                                    <option value="NEUHEIZ_brennstoffzelle">Brennstoffzellenheizung</option>
                                    <option value="NEUHEIZ_gebaeudenetz">Gebäudenetzanschluss</option>
                                    <option value="NEUHEIZ_waermenetz">Wärmenetzanschluss</option>
                                </select>
                            </div>

                            <div class="foerderRechner-formElement" id="foerderRechnerAuswahlWaermequelle">
                                <label for="antragObjektArt">Wärmequelle</label>
                                <select id="rechnerWaermequelle">
                                    <option value="WAERMEQ_luft">Luft-Wärmepumpe</option>
                                    <option value="WAERMEQ_erde_sonde">Erdreich-Wärmepumpe mit Sonde</option>
                                    <option value="WAERMEQ_erde_kollektor">Erdreich-Wärmepumpe mit Kollektor</option>
                                    <option value="WAERMEQ_grundwasser">Grundwasser-Wärmepumpe</option>
                                </select>
                            </div>
                        </div>

                        <div class="foerderRechner-col foerderRechner-haustechnik-rechts">
                            <div class="foerderRechner-formElement">
                                <div class="foerderRechner-heiztechnik-output">
                                    <label for="kostenHeizungstechnik" class="foerderRechner-kosten-label">Kosten Heizungstechnik</label>
                                    <span class="foerderRechner-foerderKostenHeiztechnik" id="kostenHeizungstechnikValue">10.000 €</span>
                                </div>
                                <input type="range" min="0" max="30000" step="100" value="0" id="kostenHeizungstechnik" />
                            </div>

                            <div id="foerderRechnerAuswahlKaeltemittel" class="foerderRechner-formElement foerderRechner-naturKaeltemittel">
                                <input id="switchrechnerKaeltemittel" type="checkbox" />
                                <label for="switchrechnerKaeltemittel">Natürliche Kältemittel kommen zum Einsatz</label>
                            </div>

                            <div id="foerderRechnerAuswahlEmission" class="foerderRechner-formElement foerderRechner-naturKaeltemittel">
                                <input id="switchrechnerEmission" type="checkbox" />
                                <label for="switchrechnerEmission">Emissions­minderungs­zuschlag (Emissions­grenzwert für Staub unter 2,5 mg/m3)</label>
                            </div>

                            <div id="foerderRechnerAuswahlBiomasse" class="foerderRechner-formElement foerderRechner-naturKaeltemittel">
                                <input id="switchrechnerBiomasse" type="checkbox" />
                                <label for="switchrechnerBiomasse">Biomasseheizung wird kombiniert mit einer solarthermischen Anlage, PV-Anlage oder einer Wärmepumpe. (Hinweis: Erweiterte Anforderungen sind zu beachten.)</label>
                            </div>

                            <!--<div class="foerderRechner-formElement">
                                <p class="foerderRechner-foerderKostenHeiztechnik" id="kostenHeizungstechnikValue">10.000 €</p>
                            </div>-->

                        </div>
                    </div>

                </div>
            </div>

            <!-- Förderung -->
            <div class="foerderRechner-card">
                <div class="foerderRechner-card-header">
                    <h3>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->
                            <path d="M312 24l0 10.5c6.4 1.2 12.6 2.7 18.2 4.2c12.8 3.4 20.4 16.6 17 29.4s-16.6 20.4-29.4 17c-10.9-2.9-21.1-4.9-30.2-5c-7.3-.1-14.7 1.7-19.4 4.4c-2.1 1.3-3.1 2.4-3.5 3c-.3 .5-.7 1.2-.7 2.8c0 .3 0 .5 0 .6c.2 .2 .9 1.2 3.3 2.6c5.8 3.5 14.4 6.2 27.4 10.1l.9 .3s0 0 0 0c11.1 3.3 25.9 7.8 37.9 15.3c13.7 8.6 26.1 22.9 26.4 44.9c.3 22.5-11.4 38.9-26.7 48.5c-6.7 4.1-13.9 7-21.3 8.8l0 10.6c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-11.4c-9.5-2.3-18.2-5.3-25.6-7.8c-2.1-.7-4.1-1.4-6-2c-12.6-4.2-19.4-17.8-15.2-30.4s17.8-19.4 30.4-15.2c2.6 .9 5 1.7 7.3 2.5c13.6 4.6 23.4 7.9 33.9 8.3c8 .3 15.1-1.6 19.2-4.1c1.9-1.2 2.8-2.2 3.2-2.9c.4-.6 .9-1.8 .8-4.1l0-.2c0-1 0-2.1-4-4.6c-5.7-3.6-14.3-6.4-27.1-10.3l-1.9-.6c-10.8-3.2-25-7.5-36.4-14.4c-13.5-8.1-26.5-22-26.6-44.1c-.1-22.9 12.9-38.6 27.7-47.4c6.4-3.8 13.3-6.4 20.2-8.2L264 24c0-13.3 10.7-24 24-24s24 10.7 24 24zM568.2 336.3c13.1 17.8 9.3 42.8-8.5 55.9L433.1 485.5c-23.4 17.2-51.6 26.5-80.7 26.5L192 512 32 512c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l36.8 0 44.9-36c22.7-18.2 50.9-28 80-28l78.3 0 16 0 64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0-16 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l120.6 0 119.7-88.2c17.8-13.1 42.8-9.3 55.9 8.5zM193.6 384c0 0 0 0 0 0l-.9 0c.3 0 .6 0 .9 0z" />
                        </svg>
                        Förderung
                    </h3>

                    <div class="foerderRechner-card-body">

                        <div class="foerderRechner-col">
                            <div class="foerderRechner-infoCard">
                                <p><strong>Prognose Gesamt-Fördersumme</strong></p>
                                <h1 id="foerderGesamtSumme">21.456,00 €</h1>
                            </div>
                        </div>

                        <div class="foerderRechner-col">
                            <div class="foerderRechner-infoCard">
                                <p><strong>Anzahl Wohneinheiten</strong></p>
                                <h1 id="foerderAnzahlWohneinheiten">1</h1>
                            </div>
                        </div>
                    </div>

                    <!--<hr>-->

                    <div class="foerderRechner-resultRow" style="display: none">
                        <div class="foerderRechner-subRow">
                            <div class="foerderRechner-resultCol">
                                <h1>
                                    <span>30 %</span>
                                    <svg id="foerderBasisfoerderung" data-foerder-enabled="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->
                                        <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z" />
                                    </svg>
                                </h1>
                                <p><strong>Basisförderung</strong></p>
                                <p class="foerderRechner-descText">Wenn Sie als Eigenheimbesitzer und/oder Vermieter jetzt auf eine klima­freundliche Heizung mit mindestens 65% erneuer­baren Energien umsteigen, erhalten Sie hierfür 30% Grundförderung für alle Wohn- und Nichtwohngebäude.</p>
                            </div>

                            <div class="foerderRechner-resultCol">
                                <h1>
                                    <span>20 %</span>
                                    <svg id="foerderGeschwindigkeitsbonus" data-foerder-enabled="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->
                                        <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z" />
                                    </svg>
                                </h1>
                                <p><strong>Geschwindigkeitsbonus</strong></p>
                                <p class="foerderRechner-descText">Den Klimageschwindigkeitsbonus in Höhe von 20% erhalten Sie, wenn Sie Ihre funktionstüchtige Öl-, Kohle-, Gasetagen- oder Nachtspeicher­heizung oder Ihre mindestens 20 Jahre alte Gas­heizung oder Bio­masse­heizung durch eine klima­freundliche Heizung ersetzen. Ab 1. Januar 2029 reduziert sich der Bonus kontinuierlich.</p>
                            </div>
                        </div>

                        <div class="foerderRechner-subRow">
                            <div class="foerderRechner-resultCol">
                                <h1>
                                    <span>30 %</span>
                                    <svg id="foerderEinkommensbonus" data-foerder-enabled="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->
                                        <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z" />
                                    </svg>
                                </h1>
                                <p><strong>Einkommensbonus</strong></p>
                                <p class="foerderRechner-descText">Bei einem zu versteuernden Haushalts­jahres­einkommen von bis zu 40.000€ können Sie für die Er­neuerung Ihrer Heizung im selbst bewohnten Eigenheim zusätzlich einen Einkommens­bonus in Höhe von 30% beantragen.</p>
                            </div>

                            <div class="foerderRechner-resultCol">
                                <h1>
                                    <span>5 %</span>
                                    <svg id="foerderEffizienzbonus" data-foerder-enabled="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->
                                        <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z" />
                                    </svg>
                                </h1>
                                <p><strong>Effizienzbonus</strong></p>
                                <p class="foerderRechner-descText">Für Wärmepumpen wird zusätzlich ein Effizienz-Bonus von 5% gewährt, wenn als Wärme­quelle Wasser, das Erdreich oder Abwasser verwendet oder ein natürliches Kälte­mittel eingesetzt wird.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    </form>

    <!-- Modal zum Erstellen des PDF-Berichts -->
    <div id="foerderRechner-modal-pdf" class="foerderRechner-modal-container">
        <div class="foerderRechner-modal-background"></div>

        <div class="foerderRechner-modal">
            <div class="foerderRechner-modal-header">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!-- !Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->
                    <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z" />
                </svg>
                <span class="foerderRechner-modal-text">Förderreport per E-Mail erhalten</span>
                <span id="foerderRechner-modal-PDF-close" class="foerderRechner-modal-close">&times;</span>
            </div>

            <div class="foerderRechner-modal-content">
                <form>
                    <p>Geben Sie eine E-Mail-Adresse ein, um den vollständigen Förderreport als PDF zu erhalten.</p>
                    <div class="foerderrechner-eMailAdresse">
                        <label>E-Mail-Adresse</label>
                        <input type="email" id="foerderRechner-email" />
                    </div>

                    <div class="foerderRechner-formElement foerderrechner-checkBeratung">
                        <input id="foerderrechnerKontakt" type="checkbox" />
                        <label for="foerderrechnerKontakt">Ich möchte zur Beratung einer Wärmepumpe kontaktiert werden.</label>
                    </div>

                    <div class="foerderRechner-formElement foerderrechner-checkAGB">
                        <input id="foerderrechnerAGB" type="checkbox" />
                        <label for="foerderrechnerAGB">Ich stimme den <a href="___AGB_LINK___" target="_blank">allgemeinen Geschäftsbedingungen</a> und der <a href="___DS_LINK___" target="_blank">Datenschutzerklärung</a> zu.</label>
                    </div>

                    <div class="foerderRechner-btn">
                        <button id="foerderBerichtSendenBtn" type="button"><strong>Förderreport als PDF erhalten</strong></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal nach Abschicken -->
    <div id="foerderRechner-modal-erfolg" class="foerderRechner-modal-container">
        <div class="foerderRechner-modal-background"></div>

        <div class="foerderRechner-modal">
            <div class="foerderRechner-modal-header foerderRechner-modal-erfolg foerder-noborder">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. -->
                    <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z"/>
                </svg>
                <span class="foerderRechner-modal-text">Ihr persönlicher Förderreport wurde an Ihre E-Mail-Adresse verschickt.</span>
                <span id="foerderRechner-modal-Erfolg-close" class="foerderRechner-modal-close foerderBerichtErfolgClose">&times;</span>
            </div>
            <div class="foerderRechner-modal-content foerder-noborder">
                <div class="foerderRechner-btn">
                    <button class="foerderBerichtErfolgClose" type="button"><strong>Schließen</strong></button>
                </div>
            </div>
        </div>
    </div>

</div>
`;
