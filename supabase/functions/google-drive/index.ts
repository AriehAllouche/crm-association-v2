// import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// import { google } from 'https://esm.sh/googleapis@126.0.1'

// // Configuration
// const SERVICE_ACCOUNT_EMAIL = Deno.env.get('SERVICE_ACCOUNT_EMAIL')
// const SERVICE_ACCOUNT_KEY = Deno.env.get('SERVICE_ACCOUNT_KEY')
// const DRIVE_FOLDER_ID = Deno.env.get('DRIVE_FOLDER_ID')

// // CORS headers
// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
//   'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
// }

// serve(async (req) => {
//   // Handle CORS preflight
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', { headers: corsHeaders })
//   }

//   const url = new URL(req.url)
//   // Supprime le préfixe éventuel de la fonction Supabase pour cibler proprement la route
//   const path = url.pathname.replace(/^\/google-drive/, '')

//   try {
//     console.log('Service Account Key configured:', !!SERVICE_ACCOUNT_KEY)
//     console.log('Service Account Email configured:', !!SERVICE_ACCOUNT_EMAIL)
//     console.log('Drive Folder ID configured:', !!DRIVE_FOLDER_ID)

//     if (!SERVICE_ACCOUNT_KEY) {
//       return new Response(
//         JSON.stringify({ error: 'Service Account key not configured' }),
//         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }

//     // Authentification avec Service Account
//     let credentials
//     try {
//       credentials = JSON.parse(SERVICE_ACCOUNT_KEY)
//       console.log('Credentials parsed successfully')
//       console.log('Client email:', credentials.client_email)
//     } catch (e) {
//       console.error('Error parsing credentials:', e)
//       return new Response(
//         JSON.stringify({ error: 'Invalid Service Account key format' }),
//         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }

//     const auth = new google.auth.GoogleAuth({
//       credentials: credentials,
//       scopes: ['https://www.googleapis.com/auth/drive.file']
//     })

//     console.log('Auth created, getting access token...')
//     const accessToken = await auth.getAccessToken()
//     console.log('Access token obtained:', !!accessToken)

//     const drive = google.drive({ version: 'v3', auth })

//     // Upload endpoint
//     if (path === '/upload' && req.method === 'POST') {
//       const formData = await req.formData()
//       const file = formData.get('file') as File
//       const folderId = formData.get('folderId') as string || DRIVE_FOLDER_ID
//       const animalId = formData.get('animalId') as string

//       if (!file) {
//         return new Response(
//           JSON.stringify({ error: 'No file provided' }),
//           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//         )
//       }

//       // Générer un nom de fichier unique
//       const timestamp = Date.now()
//       const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
//       const prefix = animalId ? `${animalId}_` : ''
//       const fileName = `${prefix}${timestamp}_${cleanName}`

//       // Correction ici : On extrait le flux de données (stream) du fichier pour l'envoyer
//       // de façon robuste à l'API Google, évitant ainsi le bug du fichier vide (0 bytes).
//       const fileStream = file.stream()

//       const response = await drive.files.create({
//         requestBody: {
//           name: fileName,
//           parents: folderId ? [folderId] : undefined
//         },
//         media: {
//           mimeType: file.type,
//           body: fileStream
//         },
//         fields: 'id,name,webViewLink,webContentLink,mimeType,size,createdTime'
//       })

//       const fileData = response.data

//       // Rendre le fichier partageable
//       await drive.permissions.create({
//         fileId: fileData.id!,
//         requestBody: {
//           role: 'reader',
//           type: 'anyone'
//         }
//       })

//       return new Response(
//         JSON.stringify(fileData),
//         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }

//     // List endpoint
//     if (path === '/list' && req.method === 'GET') {
//       const folderId = url.searchParams.get('folderId')

//       const query = folderId 
//         ? `'${folderId}' in parents and trashed=false`
//         : "name contains 'PHÉNIX' and trashed=false"

//       const response = await drive.files.list({
//         q: query,
//         fields: 'files(id,name,webViewLink,webContentLink,mimeType,size,createdTime)',
//         orderBy: 'createdTime desc',
//         pageSize: 100
//       })

//       return new Response(
//         JSON.stringify(response.data.files || []),
//         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }

//     // Delete endpoint
//     if (path === '/delete' && req.method === 'DELETE') {
//       const { fileId } = await req.json()

//       if (!fileId) {
//         return new Response(
//           JSON.stringify({ error: 'File ID is required' }),
//           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//         )
//       }

//       await drive.files.delete({
//         fileId: fileId
//       })

//       return new Response(
//         JSON.stringify({ success: true }),
//         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }

//     // Create folder endpoint
//     if (path === '/create-folder' && req.method === 'POST') {
//       const { animalId, animalName } = await req.json()

//       if (!animalId || !animalName) {
//         return new Response(
//           JSON.stringify({ error: 'animalId and animalName are required' }),
//           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//         )
//       }

//       // Créer le dossier principal
//       const folder = await drive.files.create({
//         requestBody: {
//           name: `Animal_${animalName}_${animalId}`,
//           mimeType: 'application/vnd.google-apps.folder',
//           parents: DRIVE_FOLDER_ID ? [DRIVE_FOLDER_ID] : undefined
//         },
//         fields: 'id'
//       })

//       const folderId = folder.data.id

//       // Créer des sous-dossiers
//       const subFolders = ['veterinaire', 'adoption', 'justice', 'photos', 'contrats']
      
//       for (const subFolder of subFolders) {
//         await drive.files.create({
//           requestBody: {
//             name: subFolder,
//             mimeType: 'application/vnd.google-apps.folder',
//             parents: [folderId]
//           }
//         })
//       }

//       // Rendre le dossier partageable
//       await drive.permissions.create({
//         fileId: folderId,
//         requestBody: {
//           role: 'reader',
//           type: 'anyone'
//         }
//       })

//       return new Response(
//         JSON.stringify({ folderId }),
//         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }

//     // Share endpoint
//     if (path === '/share' && req.method === 'POST') {
//       const { fileId } = await req.json()

//       if (!fileId) {
//         return new Response(
//           JSON.stringify({ error: 'File ID is required' }),
//           { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//         )
//       }

//       await drive.permissions.create({
//         fileId: fileId,
//         requestBody: {
//           role: 'reader',
//           type: 'anyone'
//         }
//       })

//       const file = await drive.files.get({
//         fileId: fileId,
//         fields: 'webViewLink'
//       })

//       return new Response(
//         JSON.stringify({ webViewLink: file.data.webViewLink }),
//         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//       )
//     }

//     return new Response(
//       JSON.stringify({ error: 'Not found' }),
//       { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//     )

//   } catch (error: any) {
//     console.error('Error:', error)
//     return new Response(
//       JSON.stringify({ error: error.message || 'Internal server error' }),
//       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
//     )
//   }
// })

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { google } from 'https://esm.sh/googleapis@126.0.1'

// Configuration
const SERVICE_ACCOUNT_EMAIL = Deno.env.get('SERVICE_ACCOUNT_EMAIL')
const SERVICE_ACCOUNT_KEY = Deno.env.get('SERVICE_ACCOUNT_KEY')
const DRIVE_FOLDER_ID = Deno.env.get('DRIVE_FOLDER_ID')

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
}

// -----------------------------------------------------------------------
// Manual multipart upload to the Drive REST endpoint.
//
// Why this exists: the googleapis Node client's `media.body` upload path
// expects a Node.js Readable stream (something with .pipe()/.on('data')).
// In Deno, `file.stream()` returns a WHATWG ReadableStream, which the
// client does NOT understand. It fails silently instead of throwing,
// so Drive ends up creating a file entry with 0 bytes. Building the
// multipart request ourselves and sending it with fetch() sidesteps
// that incompatibility entirely.
// -----------------------------------------------------------------------
async function uploadFileMultipart(
  accessToken: string,
  fileName: string,
  mimeType: string,
  parents: string[] | undefined,
  fileBytes: Uint8Array
) {
  const boundary = 'drive_boundary_' + crypto.randomUUID()
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelim = `\r\n--${boundary}--`

  const metadata: Record<string, unknown> = { name: fileName }
  if (parents) metadata.parents = parents

  const encoder = new TextEncoder()

  const metadataPart = encoder.encode(
    delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata)
  )

  const mediaHeader = encoder.encode(
    delimiter + `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
  )

  const closing = encoder.encode(closeDelim)

  const body = new Uint8Array(
    metadataPart.length + mediaHeader.length + fileBytes.length + closing.length
  )
  let offset = 0
  body.set(metadataPart, offset); offset += metadataPart.length
  body.set(mediaHeader, offset); offset += mediaHeader.length
  body.set(fileBytes, offset); offset += fileBytes.length
  body.set(closing, offset)

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,mimeType,size,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Drive upload failed (${res.status}): ${text}`)
  }

  return await res.json()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/google-drive/, '')

  try {
    if (!SERVICE_ACCOUNT_KEY) {
      return new Response(
        JSON.stringify({ error: 'Service Account key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let credentials
    try {
      credentials = JSON.parse(SERVICE_ACCOUNT_KEY)
    } catch (e) {
      console.error('Error parsing credentials:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid Service Account key format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    })

    const drive = google.drive({ version: 'v3', auth })

    // Upload endpoint
    if (path === '/upload' && req.method === 'POST') {
      const formData = await req.formData()
      const file = formData.get('file') as File
      const folderId = (formData.get('folderId') as string) || DRIVE_FOLDER_ID
      const animalId = formData.get('animalId') as string

      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const timestamp = Date.now()
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const prefix = animalId ? `${animalId}_` : ''
      const fileName = `${prefix}${timestamp}_${cleanName}`

      // Read the whole file into memory and send it ourselves — see
      // uploadFileMultipart() comment above for why this replaces the
      // googleapis client's media.body upload.
      const arrayBuffer = await file.arrayBuffer()
      const fileBytes = new Uint8Array(arrayBuffer)

      if (fileBytes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Uploaded file is empty (0 bytes) before it even reached Drive' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const tokenResponse = await auth.getAccessToken()
      const accessToken =
        typeof tokenResponse === 'string' ? tokenResponse : (tokenResponse as any)?.token
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'Could not obtain access token from service account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const fileData = await uploadFileMultipart(
        accessToken,
        fileName,
        file.type,
        folderId ? [folderId] : undefined,
        fileBytes
      )

      // Rendre le fichier partageable
      await drive.permissions.create({
        fileId: fileData.id!,
        requestBody: { role: 'reader', type: 'anyone' }
      })

      return new Response(
        JSON.stringify(fileData),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // List endpoint
    if (path === '/list' && req.method === 'GET') {
      const folderId = url.searchParams.get('folderId')

      const query = folderId
        ? `'${folderId}' in parents and trashed=false`
        : "name contains 'PHÉNIX' and trashed=false"

      const response = await drive.files.list({
        q: query,
        fields: 'files(id,name,webViewLink,webContentLink,mimeType,size,createdTime)',
        orderBy: 'createdTime desc',
        pageSize: 100
      })

      return new Response(
        JSON.stringify(response.data.files || []),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete endpoint
    if (path === '/delete' && req.method === 'DELETE') {
      const { fileId } = await req.json()

      if (!fileId) {
        return new Response(
          JSON.stringify({ error: 'File ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await drive.files.delete({ fileId: fileId })

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create folder endpoint
    if (path === '/create-folder' && req.method === 'POST') {
      const { animalId, animalName } = await req.json()

      if (!animalId || !animalName) {
        return new Response(
          JSON.stringify({ error: 'animalId and animalName are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const folder = await drive.files.create({
        requestBody: {
          name: `Animal_${animalName}_${animalId}`,
          mimeType: 'application/vnd.google-apps.folder',
          parents: DRIVE_FOLDER_ID ? [DRIVE_FOLDER_ID] : undefined
        },
        fields: 'id'
      })

      const folderId = folder.data.id

      const subFolders = ['veterinaire', 'adoption', 'justice', 'photos', 'contrats']

      for (const subFolder of subFolders) {
        await drive.files.create({
          requestBody: {
            name: subFolder,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [folderId]
          }
        })
      }

      await drive.permissions.create({
        fileId: folderId,
        requestBody: { role: 'reader', type: 'anyone' }
      })

      return new Response(
        JSON.stringify({ folderId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Share endpoint
    if (path === '/share' && req.method === 'POST') {
      const { fileId } = await req.json()

      if (!fileId) {
        return new Response(
          JSON.stringify({ error: 'File ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await drive.permissions.create({
        fileId: fileId,
        requestBody: { role: 'reader', type: 'anyone' }
      })

      const file = await drive.files.get({
        fileId: fileId,
        fields: 'webViewLink'
      })

      return new Response(
        JSON.stringify({ webViewLink: file.data.webViewLink }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})