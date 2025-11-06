module.exports = function(RED) {
    "use strict";
    
    var multicast = require("@chirpstack/chirpstack-api/api/multicast_group_grpc_pb");
    var multicast_pb = require("@chirpstack/chirpstack-api/api/multicast_group_pb");
    var grpc = require("@grpc/grpc-js");

    // ===== Configuration du serveur ChirpStack =====
    function ChirpStackServerNode(config) {
        RED.nodes.createNode(this, config);
        this.server = config.server;
        this.apiToken = this.credentials.apiToken;
    }

    RED.nodes.registerType("chirpstack-server-multicast", ChirpStackServerNode, {
        credentials: {
            apiToken: { type: "password" }
        }
    });

    // ===== Nœud Multicast Downlink =====
    function ChirpStackMulticastNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        // Récupération de la configuration du serveur
        const serverConfig = RED.nodes.getNode(config.server);
        
        if (!serverConfig) {
            node.error("Configuration serveur manquante");
            return;
        }
        
        const server = serverConfig.server;
        const apiToken = serverConfig.apiToken;
        
        if (!server || !apiToken) {
            node.error("Serveur ou API Token non configuré");
            return;
        }
        
        // Création du client gRPC
        this.client = new multicast.MulticastGroupServiceClient(
            server,
            grpc.credentials.createInsecure()
        );
        
        node.status({fill: "grey", shape: "ring", text: "Prêt"});

        // ===== Gestion des messages entrants =====
        node.on('input', function(msg) {
            
            // Extraction des paramètres
            const mcGroupId = config.multicastGroupId || 
                            msg.multicastGroupId || 
                            msg.payload.multicastGroupId;
            
            const fPort = config.fPort || 
                         msg.fPort || 
                         msg.payload.fPort || 
                         10;
            
            let data = msg.payload.data || msg.payload;
            
            // Validation du multicast group ID
            if (!mcGroupId) {
                node.error("Multicast Group ID manquant");
                node.status({fill: "red", shape: "ring", text: "ID manquant"});
                return;
            }
            
            // Conversion des données en Buffer
            let dataBuffer;
 

            try {
                if (Buffer.isBuffer(data)) {
                    dataBuffer = data;
                } else if (typeof data === 'string') {
                    // Détection auto hex ou base64
                    if (/^[0-9A-Fa-f]+$/.test(data) && data.length % 2 === 0) {
                        // Hex
                        dataBuffer = Buffer.from(data, 'hex');
                    } else if (/^[A-Za-z0-9+/=]+$/.test(data)) {
                        // Base64
                        dataBuffer = Buffer.from(data, 'base64');
                    } else {
                        // UTF-8
                        dataBuffer = Buffer.from(data, 'utf8');
                    }
                } else if (typeof data === 'object' && data.type === 'Buffer') {
                    // Buffer sérialisé
                    dataBuffer = Buffer.from(data.data);
                } else {
                    node.error("Format de données non supporté");
                    node.status({fill: "red", shape: "ring", text: "Format invalide"});
                    return;
                }
            } catch (err) {
                node.error("Erreur conversion données: " + err.message);
                node.status({fill: "red", shape: "ring", text: "Erreur conversion"});
                return;
            }
            // Logs de debug (optionnel)
            if (config.debug) {
                node.warn("=== Multicast Downlink ===");
                node.warn("Group ID: " + mcGroupId);
                node.warn("fPort: " + fPort);
                node.warn("Data (hex): " + dataBuffer.toString('hex'));
                node.warn("Data (base64): " + dataBuffer.toString('base64'));
            }
            
            // Metadata d'authentification
            const metadata = new grpc.Metadata();
            metadata.set("authorization", "Bearer " + apiToken);

            // Construction de la requête gRPC

           const request = new multicast_pb.EnqueueMulticastGroupQueueItemRequest();
            
            const queueItem = new multicast_pb.MulticastGroupQueueItem();
            queueItem.setFPort(fPort);
            queueItem.setData(dataBuffer);
            queueItem.setMulticastGroupId(mcGroupId);
            
            request.setQueueItem(queueItem);
          
            // Envoi de la requête
            node.status({fill: "blue", shape: "dot", text: "Envoi..."});
            
            node.client.enqueue(request, metadata, function(error, response) {
                if (error) {
                    node.error("Erreur gRPC multicast: " + error.message);
                    node.status({fill: "red", shape: "ring", text: "Erreur: " + error.code});
                    
                    msg.error = {
                        message: error.message,
                        code: error.code,
                        details: error.details
                    };
                    msg.payload = {
                        success: false,
                        error: error.message
                    };
                } else {
                    node.status({fill: "green", shape: "dot", text: "Envoyé (fCnt: " + response.getFCnt() + ")"});
                    
                    msg.payload = {
                        success: true,
                        fCnt: response.getFCnt(),
                        multicastGroupId: mcGroupId,
                        fPort: fPort,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Réinitialiser le statut après 3 secondes
                    setTimeout(function() {
                        node.status({fill: "grey", shape: "ring", text: "Prêt"});
                    }, 3000);
                }
                
                node.send(msg);
            });
        });
        
        // Nettoyage à la fermeture
        node.on('close', function() {
            if (node.client) {
                node.client.close();
            }
        });
    }
    
    RED.nodes.registerType("chirpstack-multicast", ChirpStackMulticastNode);
}