// netlify/functions/conversations.js
const faunadb = require('faunadb');

// Initialize FaunaDB client
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY,
});

const q = faunadb.query;

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' }),
    };
  }

  try {
    const { httpMethod, path, body } = event;
    const { user } = context.clientContext || {};
    
    // Extract user ID from Auth0 context
    const userId = user?.sub || event.headers['x-user-id'];
    
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User authentication required' }),
      };
    }

    switch (httpMethod) {
      case 'GET':
        return await getConversations(userId);
      
      case 'POST':
        return await saveConversation(userId, JSON.parse(body));
      
      case 'DELETE':
        return await deleteConversations(userId);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    };
  }
};

async function getConversations(userId) {
  try {
    const result = await client.query(
      q.Map(
        q.Paginate(
          q.Match(q.Index('conversations_by_user'), userId),
          { size: 100 }
        ),
        q.Lambda('ref', q.Get(q.Var('ref')))
      )
    );

    const conversations = result.data.map(doc => ({
      id: doc.ref.id,
      ...doc.data
    }));

    // Sort by timestamp (most recent first)
    conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conversations,
        total: conversations.length
      }),
    };
  } catch (error) {
    if (error.name === 'NotFound') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ conversations: [], total: 0 }),
      };
    }
    throw error;
  }
}

async function saveConversation(userId, conversationData) {
  try {
    const { messages, metadata } = conversationData;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid messages array is required' }),
      };
    }

    // Create conversation document
    const conversationDoc = {
      userId,
      messages: messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        resources: msg.resources || [],
        isStudyNotes: msg.isStudyNotes || false
      })),
      metadata: {
        messageCount: messages.length,
        lastUserMessage: messages.filter(m => m.type === 'user').pop()?.content?.substring(0, 100),
        topics: metadata?.topics || [],
        ...metadata
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await client.query(
      q.Create(q.Collection('conversations'), {
        data: conversationDoc
      })
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: result.ref.id,
        message: 'Conversation saved successfully',
        messageCount: messages.length
      }),
    };
  } catch (error) {
    throw error;
  }
}

async function deleteConversations(userId) {
  try {
    // Delete all conversations for the user
    await client.query(
      q.Map(
        q.Paginate(q.Match(q.Index('conversations_by_user'), userId)),
        q.Lambda('ref', q.Delete(q.Var('ref')))
      )
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'All conversations deleted successfully' }),
    };
  } catch (error) {
    throw error;
  }
}
