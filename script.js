// Función para cambiar de pestañas
function openTab(event, tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabName === 'registros') {
        fetchRegistros();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const inscripcionForm = document.getElementById('inscripcionForm');
    const registroList = document.getElementById('registroList');

    // Configuración de AWS
    AWS.config.update({
        accessKeyId: '', 
        secretAccessKey: '',
        sessionToken: '',
        region: 'us-east-1'
    });

    const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
    const API_ENDPOINT = 'https://qem5c0hezk.execute-api.us-east-1.amazonaws.com/default/registroevento';
    const API_ENDPOINT_GET = API_ENDPOINT + '?TableName=registroeventos';
    
    // Subir foto a S3
    async function uploadFoto(file) {
        const params = {
            Bucket: 'imagenesregistros',
            Key: `fotos/${file.name}`,
            Body: file,
            ACL: 'public-read'
        };

        return new Promise((resolve, reject) => {
            s3.upload(params, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.Location);
                }
            });
        });
    }

    // Registrar inscripción en DynamoDB a través de API Gateway
    async function registrarInscripcion(data) {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error en la respuesta de la API:', errorData);
            throw new Error(`Error en la inscripción: ${errorData.error}`);
        }

        return await response.json(); // Parsea y devuelve la respuesta
    }

    // Obtener registros desde DynamoDB a través de API Gateway
    async function fetchRegistros() {
        const response = await fetch(API_ENDPOINT_GET, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error al obtener registros:', errorData);
            throw new Error('Error al obtener registros');
        }

        const data = await response.json();
        
        console.log('Datos enviados:', JSON.stringify(data, null, 2));
        renderRegistros(data.Items);
    }

    // Renderizar registros en la lista
    function renderRegistros(registros) {
        registroList.innerHTML = '';

        if (registros && registros.length > 0) {
            registros.forEach(registro => {
                const li = document.createElement('li');
                const img = document.createElement('img');
                img.src = registro.fotoUrl;
                img.alt = `${registro.nombre} ${registro.apellido} - ${registro.cedula}`;
                img.style.width = '50px';
                img.style.height = '50px';
                img.style.marginRight = '10px';

                li.appendChild(img);
                li.appendChild(document.createTextNode(`${registro.nombre} ${registro.apellido} - ${registro.cedula} - ${registro.correo}`));
                registroList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No hay registros disponibles.';
            registroList.appendChild(li);
        }
    }

    // Manejar el formulario de inscripción
    inscripcionForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const apellido = document.getElementById('apellido').value;
        const cedula = document.getElementById('cedula').value;
        const correo = document.getElementById('correo').value;
        const foto = document.getElementById('foto').files[0];

        try {
            const fotoUrl = await uploadFoto(foto);
            const requestData = {
                TableName: 'registroeventos',
                Item: {
                    cedula: cedula,
                    nombre: nombre,
                    apellido: apellido,
                    correo: correo,
                    fotoUrl: fotoUrl
                }
            };
            console.log('Datos enviados:', JSON.stringify(requestData, null, 2));
            const response = await registrarInscripcion(requestData);

            console.log('Registro exitoso:', response);
            alert('Registro exitoso');
            inscripcionForm.reset();
            fetchRegistros(); // Actualizar lista después de registrar un nuevo usuario
        } catch (error) {
            console.error('Error en el registro:', error);
            alert('Error en el registro: ' + error.message);
        }
    });

    // Obtener registros al cargar la página
    fetchRegistros();
});
